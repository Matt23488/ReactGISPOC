import { EsriTypeMap, loadTypedModules, MapChild } from '../utilities/GIS';
import { ConstructorInstance, Diff, FirstConstructorArgument } from '../utilities/Types';
import { DOMWidgetProperties, GenericWidgetConstructorKeys, MapChildWidgetProperties, MapWidgetProperties, WidgetProperties } from './WidgetTypes';
import * as mapSpy from '../MapSpy';

export function loadWidget<T extends GenericWidgetConstructorKeys>(props: MapWidgetProperties<T, false> & MapChild): Promise<__esri.Widget>;
export function loadWidget<T extends GenericWidgetConstructorKeys>(props: MapWidgetProperties<T, true> & MapChild): Promise<[__esri.Widget,__esri.Expand]>;
export function loadWidget<T extends GenericWidgetConstructorKeys>(props: DOMWidgetProperties<T> & MapChild): Promise<__esri.Widget>;
export async function loadWidget<T extends GenericWidgetConstructorKeys, U extends boolean = false>(props: WidgetProperties<T, U>): Promise<__esri.Widget | [__esri.Widget,__esri.Expand]> {
    let widget: __esri.Widget | undefined;
    const widgetInitializer = initDefinitions.find(i => i.type === props.type);
    if (WidgetProperties.isExpandableMapWidget(props)) {
        const [ WidgetConstructor, Expand ] = await loadTypedModules(props.type, 'esri/widgets/Expand');
        if (widgetInitializer) widget = await widgetInitializer.init(props);
        else widget = new WidgetConstructor(buildWidgetProps(props as any) as __esri.WidgetProperties);

        const expand = new Expand({
            view: props.view as __esri.View & { type: '2d' | '3d' },
            content: widget,
            ...props.expandProperties
        });
        return [widget as ConstructorInstance<EsriTypeMap[T]>, expand];
    }

    if (widgetInitializer) widget = await widgetInitializer.init(props);
    else {
        const [ WidgetConstructor ] = await loadTypedModules(props.type);
        widget = new WidgetConstructor(buildWidgetProps(props as any) as __esri.WidgetProperties);
    }
    return widget as ConstructorInstance<EsriTypeMap[T]>;
}

export function buildWidgetProps<T extends GenericWidgetConstructorKeys>(props: MapWidgetProperties<T, boolean> & MapChild): Diff<FirstConstructorArgument<EsriTypeMap[T]>, undefined>;
export function buildWidgetProps<T extends GenericWidgetConstructorKeys>(props: DOMWidgetProperties<T> & MapChild): Diff<FirstConstructorArgument<EsriTypeMap[T]>, undefined>;
export function buildWidgetProps<T extends GenericWidgetConstructorKeys, U extends boolean = false>(props: MapChildWidgetProperties<T, U>) {
    return {
        view: (MapChild.guard(props) ? props.view : undefined),
        id: props.id,
        container: (WidgetProperties.isDOMWidget(props as WidgetProperties<T, U>) ? props.domId : undefined),
        ...props.widgetProperties
    } as Diff<FirstConstructorArgument<EsriTypeMap[T]>, undefined>;
}

interface WidgetInitDefinition {
    type: GenericWidgetConstructorKeys;
    init(props: MapChildWidgetProperties<any, any>): Promise<__esri.Widget>;
}
export const initDefinitions: WidgetInitDefinition[] = [
    {
        type: 'esri/widgets/Fullscreen',
        async init(props: MapChildWidgetProperties<'esri/widgets/Fullscreen', boolean>) {
            const [ Fullscreen, watchUtils ] = await loadTypedModules(props.type, 'esri/core/watchUtils')
            const widgetProperties = buildWidgetProps(props as any) as __esri.FullscreenProperties;
            const widget = new Fullscreen(widgetProperties);
            watchUtils.watch(widget.viewModel, 'state', (value: __esri.FullscreenViewModel['state']) => {
                if (value === 'ready') {
                    widget.view.container.style.width = '100%';
                    widget.view.container.style.height = '100%';
                }
            });

            return widget;
        }
    }, {
        type: 'esri/widgets/Sketch',
        async init(props: MapChildWidgetProperties<'esri/widgets/Sketch'>) {
            const [ layer, [ Sketch ]] = await Promise.all([mapSpy.getLayer<__esri.GraphicsLayer>(props.map, props.layer), loadTypedModules(props.type)]);
            const widgetProperties = buildWidgetProps(props as any) as __esri.SketchProperties;
            widgetProperties.layer = layer;
            return new Sketch(widgetProperties);
        }
    }, {
        type: 'esri/widgets/Editor',
        async init(props: MapChildWidgetProperties<'esri/widgets/Editor', boolean>) {
            const [ Editor ] = await loadTypedModules(props.type);
            
            const widgetProperties = buildWidgetProps(props as any) as __esri.EditorProperties;
            if (props.layers) {
                const allLayers = await mapSpy.getLayers(props.view);
                console.log('Editor allLayers', allLayers);
                if (allLayers) {
                    widgetProperties.layerInfos = allLayers.filter(l => l.type === 'feature').map(l => ({
                        view: props.view,
                        layer: l as __esri.FeatureLayer,
                        enabled: props.layers!.indexOf(l.id) >= 0,
                        fieldConfig: (l as __esri.FeatureLayer).fields.map(f => ({
                            name: f.name,
                            label: f.alias
                        } as __esri.FieldConfig))
                    } as __esri.LayerInfo));
                }
            }

            return new Editor(widgetProperties);
        }
    }, {
        type: 'esri/widgets/FeatureTable',
        async init(props: MapChildWidgetProperties<'esri/widgets/FeatureTable', boolean>) {
            const layer = await mapSpy.getLayer<__esri.FeatureLayer>(props.map, props.layer);
            const [FeatureTable, watchUtils] = await loadTypedModules('esri/widgets/FeatureTable', 'esri/core/watchUtils');
            const widgetProperties = buildWidgetProps(props as any) as __esri.FeatureTableProperties;
            widgetProperties.layer = layer;
            widgetProperties.fieldConfigs = layer?.fields.map(f => ({ name: f.name, label: f.alias }));
            const widget = new FeatureTable(widgetProperties);

            let prevExtent = (props.view as __esri.MapView).extent;
            watchUtils.whenFalse(props.view, 'updating', () => {
                const extent = (props.view as __esri.MapView).extent
                if (extent && !extent.equals(prevExtent)) {
                    widget.filterGeometry = extent;
                    prevExtent = extent;
                }
            });

            let features: Array<{ feature: __esri.Graphic}> = [];
            widget.on('selection-change', changes => {
                changes.removed.forEach(item => {
                    const data = features.find(data => data.feature === item.feature);
                    if (data) features.splice(features.indexOf(data), 1);
                });

                changes.added.forEach(item => features.push({ feature: item.feature }));
            });

            props.view.on('immediate-click', event => {
                (props.view as __esri.MapView).hitTest(event).then(response => {
                    const candidate = response.results.find(result => result.graphic && result.graphic.layer === layer);
                    candidate && widget.selectRows(candidate!.graphic);
                });
            });

            return widget;
        }
    }
];