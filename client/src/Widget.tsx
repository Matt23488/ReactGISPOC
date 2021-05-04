import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EsriTypeMap, getLayer, getLayers, loadTypedModules } from './utilities/GIS';

type PropertyPicker<T> = T extends { new(props: infer U, ...params: never[]): any } ? U : never;
type InstancePicker<T> = T extends { new(...params: never[]): infer U } ? U : never;

type WidgetConstructorKeys = ({
    [T in keyof EsriTypeMap]: EsriTypeMap[T] extends { new(...params: never[]): __esri.Widget } ? T : never;
})[keyof EsriTypeMap];
type WidgetPropertiesTypeMap = {
    [T in WidgetConstructorKeys]: Diff<PropertyPicker<EsriTypeMap[T]>, undefined>
};
type GenericWidgetConstructorKeys = Diff<WidgetConstructorKeys, 'esri/widgets/Expand' | 'esri/widgets/Sketch' | 'esri/widgets/Editor'>;

type Diff<T, U> = T extends U ? never : T;
type Remove<T, U> = { [K in Diff<keyof T, U> ]: T[K] };
type Optional<T> = { [U in keyof T]?: T[U] };

interface WidgetProperties<T extends WidgetConstructorKeys> {
    type: T;
    widgetProperties?: Optional<Remove<WidgetPropertiesTypeMap[T], keyof WidgetProperties<T>>>;
    view?: __esri.View;
    map?: __esri.Map;
    position?: __esri.UIAddComponent['position'];
    init?: (widget: InstancePicker<EsriTypeMap[T]>) => void;
    id: string;
}

interface ExpandableWidgetProperties<T extends GenericWidgetConstructorKeys> extends WidgetProperties<T> {
    expandProperties?: Optional<Remove<__esri.ExpandProperties, 'content'>>;
}

interface ExpandableHTMLProperties {
    view?: __esri.View;
    map?: __esri.Map;
    content: JSX.Element | string | HTMLElement;
    position?: __esri.UIAddComponent['position'];
    expandProperties?: Optional<Remove<__esri.ExpandProperties, 'content' | 'view'>>;
}

interface WidgetQueueItem {
    view: __esri.View;
    getWidget: () => __esri.Widget;
    position: __esri.UIAddComponent['position'];
    ready: boolean;
}

// Because the widgets load asynchronously, it's unpredictable when view.ui.add() gets called normally.
// This solves that problem by adding the widgets to a queue as they are initialized by React,
// and once they have all finished loading, THEN we add them to the UI in the order they
// are initialized by React. This makes it possible to control their locations by how
// you order them as components inside of a map.
let widgetQueue: WidgetQueueItem[] = [];
function queueWidget(view: __esri.View, getWidget: () => __esri.Widget, position: __esri.UIAddComponent['position']) {
    const record = { view, getWidget, position, ready: false };
    widgetQueue.push(record);
    // let widgetPromiseResolver: (widget: __esri.Widget) => void;
    // MapContext.registerWidget(view, widgetId, new Promise(resolve => widgetPromiseResolver = resolve));
    return function onReady() {
        record.ready = true;
        // widgetPromiseResolver(getWidget());
        if (widgetQueue.every(t => t.ready)) {
            widgetQueue.forEach(t => t.view.ui.add(t.getWidget(), { position: t.position }));
            widgetQueue = [];
        }
    }
}

export function Widget<T extends GenericWidgetConstructorKeys>(props: WidgetProperties<T>) {
    React.useEffect(() => {
        let widget: __esri.Widget | undefined;
        const onReady = queueWidget(props.view!, () => widget!, props.position);
        (async function () {
            const [ WidgetConstructor ] = await loadTypedModules(props.type);
            const widgetProperties = { view: props.view, id: props.id, ...props.widgetProperties } as __esri.WidgetProperties;
            
            widget = new WidgetConstructor(widgetProperties);
            specialInitFunctions.find(obj => obj.type === props.type)?.init(widget);
            if (props.init) props.init(widget as InstancePicker<EsriTypeMap[T]>);
            onReady();
        })();

        return function cleanup() {
            if (widget) props.view?.ui.remove(widget);
        }
    });

    return null;
}

export function ExpandableWidget<T extends GenericWidgetConstructorKeys>(props: ExpandableWidgetProperties<T>) {
    React.useEffect(() => {
        let expand: __esri.Expand | undefined;
        const onReady = queueWidget(props.view!, () => expand!, props.position);
        (async function () {
            const [ Expand, WidgetConstructor ] = await loadTypedModules('esri/widgets/Expand', props.type);
            const widgetProperties = { view: props.view, id: props.id, ...props.widgetProperties } as __esri.WidgetProperties;

            const widget = new WidgetConstructor(widgetProperties);
            specialInitFunctions.find(obj => obj.type === props.type)?.init(widget);
            if (props.init) props.init(widget as InstancePicker<EsriTypeMap[T]>);

            expand = new Expand({
                content: widget,
                ...props.expandProperties
            });
            onReady();
        })();

        return function cleanup() {
            if (expand) props.view?.ui.remove(expand);
        }
    });

    return null;
}

export function ExpandableHTML(props: ExpandableHTMLProperties) {
    React.useEffect(() => {
        let expand: __esri.Expand | undefined;
        const onReady = queueWidget(props.view!, () => expand!, props.position);
        (async function () {
            const [ Expand ] = await loadTypedModules('esri/widgets/Expand');

            let content: string | Node;
            if (typeof props.content === 'string' || props.content instanceof HTMLElement) {
                content = props.content;
            } else content = renderToStaticMarkup(props.content);

            expand = new Expand({
                content,
                ...props.expandProperties
            });
            onReady();
        })();

        return function cleanup() {
            if (expand) props.view?.ui.remove(expand);
        }
    });

    return null;
}

// TODO: Figure out how to improve the Expandable Widget API
// To make it compatible with this.
interface SketchProps {
    widgetProperties?: Optional<Remove<WidgetPropertiesTypeMap['esri/widgets/Sketch'], keyof SketchProps>>;
    view?: __esri.View;
    map?: __esri.Map;
    position?: __esri.UIAddComponent['position'];
    init?: (widget: InstancePicker<EsriTypeMap['esri/widgets/Editor']>) => void;
    layer: string;
    id: string;
}

export function Sketch(props: SketchProps) {
    React.useEffect(() => {
        let sketch: __esri.Sketch | undefined;
        const onReady = queueWidget(props.view!, () => sketch!, props.position);
        (async function () {
            const [SketchConstructor] = await loadTypedModules('esri/widgets/Sketch');

            // props.view?.on('layerview-create', e => {
            //     if (e.layer.id !== props.layer) return;


            // });
            const layer = await getLayer<__esri.GraphicsLayer>(props.map!, props.layer);
            console.log(`Sketch got ${props.layer}`, layer);
            sketch = new SketchConstructor({ view: props.view, id: props.id, layer: layer, ...props.widgetProperties } as __esri.WidgetProperties);
            onReady();
        })();

        return function cleanup() {
            if (sketch) props.view?.ui.remove(sketch);
        }
    });

    return null;
}

// TODO: Same here
interface EditorProps {
    widgetProperties?: Optional<Remove<WidgetPropertiesTypeMap['esri/widgets/Editor'], 'view' | 'layer'>>;
    view?: __esri.View;
    position?: __esri.UIAddComponent['position'];
    init?: (widget: __esri.Editor) => void;
    layers?: string[];
}

export function Editor(props: EditorProps) {
    React.useEffect(() => {
        let editor: __esri.Editor | undefined;
        const onReady = queueWidget(props.view!, () => editor!, props.position);
        (async function () {
            const [EditorConstructor] = await loadTypedModules('esri/widgets/Editor');

            let layerInfos: __esri.LayerInfo[] | undefined;
            if (props.layers) {
                const allLayers = await getLayers(props.view!);
                console.log('Editor allLayers', allLayers);
                if (allLayers) {
                    layerInfos = allLayers.filter(l => l.type === 'feature').map(l => ({
                        view: props.view,
                        layer: l as __esri.FeatureLayer,
                        enabled: props.layers!.indexOf(l.id) >= 0,
                        fieldConfig: (l as __esri.FeatureLayer).fields.map(f => ({
                            name: f.name,
                            label: f.alias
                        } as __esri.FieldConfig))
                    } as __esri.LayerInfo));
                }
                console.log('Editor layerInfos', layerInfos);
            }
            
            editor = new EditorConstructor({ view: props.view, layerInfos } as __esri.EditorProperties);
            onReady();
        })();

        return function cleanup() {
            if (editor) props.view?.ui.remove(editor);
        }
    });

    return null;
}

interface SpecialInitItem {
    type: GenericWidgetConstructorKeys,
    init: (widget: any) => void | Promise<void>
}

const specialInitFunctions: SpecialInitItem[] = [
    {
        // Exiting a fullscreen map in React causes the map to lose its inline height and width properties.
        // This causes the height to shrink to 0, making the map disappear. This aims to fix that.
        // I think it's a bug in @esri/react-arcgis but I'm not certain.
        type: 'esri/widgets/Fullscreen',
        init: async (widget: __esri.Fullscreen) => {
            const [ watchUtils ] = await loadTypedModules('esri/core/watchUtils');
            watchUtils.watch(widget.viewModel, 'state', (value: __esri.FullscreenViewModel['state']) => {
                if (value === 'ready') {
                    widget.view.container.style.width = '100%';
                    widget.view.container.style.height = '100%';
                }
            });
        }
    }
];