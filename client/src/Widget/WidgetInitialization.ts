import { EsriTypeMap, loadTypedModules, MapChild } from '../utilities/GIS';
import { ConstructorInstance, Diff, FirstConstructorArgument } from '../utilities/Types';
import { GenericWidgetConstructorKeys, WidgetProperties } from './WidgetTypes';

export async function loadWidget<T extends GenericWidgetConstructorKeys>(props: WidgetProperties<T>, mapContext: MapChild, domId: string) {
    let widget: __esri.Widget | undefined;
    const widgetInitializer = initDefinitions.find(i => i.type === props.type);
    if (widgetInitializer) widget = await widgetInitializer.init(props, mapContext, domId);
    else {
        const [ WidgetConstructor ] = await loadTypedModules(props.type);
        widget = new WidgetConstructor(buildWidgetProps<T>(props, mapContext, domId) as __esri.WidgetProperties);
    }

    return widget as ConstructorInstance<EsriTypeMap[T]>;
}

function buildWidgetProps<T extends GenericWidgetConstructorKeys>(props: WidgetProperties<T>, mapContext: MapChild, domId: string) {
    return {
        view: mapContext.view,
        id: props.id,
        container: domId,
        ...props.widgetProperties
    } as Diff<FirstConstructorArgument<EsriTypeMap[T]>, undefined>;
}

interface WidgetInitDefinition {
    type: GenericWidgetConstructorKeys;
    init(props: WidgetProperties<any>, mapContext: MapChild, domId: string): Promise<__esri.Widget>;
}
export const initDefinitions: WidgetInitDefinition[] = [
    {
        type: 'esri/widgets/Fullscreen',
        async init(props: WidgetProperties<'esri/widgets/Fullscreen'>, mapContext: MapChild, domId: string) {
            const [ Fullscreen, watchUtils ] = await loadTypedModules(props.type, 'esri/core/watchUtils')
            const widgetProperties = buildWidgetProps(props, mapContext, domId) as __esri.FullscreenProperties;
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
        async init(props: WidgetProperties<'esri/widgets/Sketch'>, mapContext: MapChild, domId: string) {
            const [ Sketch ] = await loadTypedModules(props.type);
            const layer = mapContext.map.layers.find(l => l.id === props.layer);
            
            const widgetProperties = buildWidgetProps(props, mapContext, domId) as __esri.SketchProperties;
            widgetProperties.layer = layer;
            return new Sketch(widgetProperties);
        }
    }, {
        type: 'esri/widgets/Editor',
        async init(props: WidgetProperties<'esri/widgets/Editor'>, mapContext: MapChild, domId: string) {
            const [ Editor ] = await loadTypedModules(props.type);
            
            const widgetProperties = buildWidgetProps(props, mapContext, domId) as __esri.EditorProperties;
            if (props.layers) {
                const allLayers = mapContext.map.layers.toArray().filter(l => l.type === 'feature');
                await Promise.all(allLayers.map(l => l.when()));
                    widgetProperties.layerInfos = allLayers.map(l => ({
                        view: mapContext.view,
                        layer: l as __esri.FeatureLayer,
                        enabled: props.layers!.indexOf(l.id) >= 0,
                        fieldConfig: (l as __esri.FeatureLayer).fields.map(f => ({
                            name: f.name,
                            label: f.alias
                        } as __esri.FieldConfig))
                    } as __esri.LayerInfo));
                }

            return new Editor(widgetProperties);
        }
    }, {
        type: 'esri/widgets/FeatureTable',
        async init(props: WidgetProperties<'esri/widgets/FeatureTable'>, mapContext: MapChild, domId: string) {
            const [FeatureTable, watchUtils] = await loadTypedModules('esri/widgets/FeatureTable', 'esri/core/watchUtils');
            const layer = mapContext.map.layers.find(l => l.id === props.layer) as __esri.FeatureLayer;

            const widgetProperties = buildWidgetProps(props, mapContext, domId) as __esri.FeatureTableProperties;
            widgetProperties.layer = layer;
            widgetProperties.fieldConfigs = layer.fields.map(f => ({ name: f.name, label: f.alias }));
            const widget = new FeatureTable(widgetProperties);

            let prevExtent = (mapContext.view as __esri.MapView).extent;
            watchUtils.whenFalse(mapContext.view, 'updating', () => {
                const extent = (mapContext.view as __esri.MapView).extent
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

            mapContext.view.on('immediate-click', event => {
                (mapContext.view as __esri.MapView).hitTest(event).then(response => {
                    const candidate = response.results.find(result => result.graphic && result.graphic.layer === layer);
                    candidate && widget.selectRows(candidate!.graphic);
                });
            });

            return widget;
        }
    }
];