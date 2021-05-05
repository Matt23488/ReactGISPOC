import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as mapSpy from './MapSpy';
import { EsriTypeMap, loadTypedModules } from './utilities/GIS';
import { ConstructorInstance, Diff, FirstConstructorArgument, Optional, Remove } from './utilities/Types';

type WidgetConstructorKeys = ({
    [T in keyof EsriTypeMap]: EsriTypeMap[T] extends { new(...params: never[]): __esri.Widget } ? T : never;
})[keyof EsriTypeMap];
type WidgetPropertiesTypeMap = {
    [T in WidgetConstructorKeys]: Diff<FirstConstructorArgument<EsriTypeMap[T]>, undefined>
};
type GenericWidgetConstructorKeys = Diff<WidgetConstructorKeys, 'esri/widgets/Expand'>;

interface BaseWidgetProperties<T extends WidgetConstructorKeys> {
    type: T;
    widgetProperties?: Optional<Remove<WidgetPropertiesTypeMap[T], keyof WidgetProperties<T> | SpecializedWidgetPropertyRemover<T>>>;
    view?: __esri.View;
    map?: __esri.Map;
    init?: (widget: ConstructorInstance<EsriTypeMap[T]>) => void;
    id: string;
}

interface UIWidgetProperties<T extends WidgetConstructorKeys> extends BaseWidgetProperties<T> {
    position: __esri.UIAddComponent['position'];
    container?: undefined;
}

// TODO: I may remove this ability. The nature of React is such that if React updates the DOM containing an element that
// was chosen to contain a widget, it will break the state of the UI. The only way around this is to ensure
// that the DOM element chosen is outside the React application root, which kind of defeats the purpose.
// But you can also make sure that the dom element is rendered as part of the same component that renders the map.
// This way if React updates the container DOM, you'll know it will also call render() on the widget and thus
// the UI should remain consistent. I'd have to test that more thorougly to be sure.
// I might leave it in and just specify the possible issues in the documentation.
interface DOMWidgetProperties<T extends WidgetConstructorKeys> extends BaseWidgetProperties<T> {
    container: string | HTMLElement;
    position?: undefined;
}

type WidgetProperties<T extends WidgetConstructorKeys> = SpecializedWidgetProperties<T> & (UIWidgetProperties<T> | DOMWidgetProperties<T>);
// eslint-disable-next-line
const WidgetProperties = {
    isUIWidget: <T extends WidgetConstructorKeys>(props: BaseWidgetProperties<T>): props is UIWidgetProperties<T> => {
        return typeof (props as UIWidgetProperties<T>).position !== 'undefined';
    },

    isDOMWidget: <T extends WidgetConstructorKeys>(props: BaseWidgetProperties<T>): props is DOMWidgetProperties<T> => {
        return typeof (props as DOMWidgetProperties<T>).container !== 'undefined';
    }
};

type ExpandableWidgetProperties<T extends GenericWidgetConstructorKeys> = WidgetProperties<T> & {
    expandProperties?: Optional<Remove<__esri.ExpandProperties, 'content'>>;
};

interface SpecializedWidgetPropertyTypeMap {
    'esri/widgets/Sketch': { layer: string };
    'esri/widgets/Editor': { layers?: string[] };
    'esri/widgets/FeatureTable': { layer: string };
}
type SpecializedWidgetProperties<T extends WidgetConstructorKeys> = T extends keyof SpecializedWidgetPropertyTypeMap ? SpecializedWidgetPropertyTypeMap[T] : {};

interface SpecializedWidgetPropertyRemoverTypeMap {
    'esri/widgets/Editor': 'layerInfos';
}
type SpecializedWidgetPropertyRemover<T extends WidgetConstructorKeys> = T extends keyof SpecializedWidgetPropertyRemoverTypeMap ? SpecializedWidgetPropertyRemoverTypeMap[T] : never;

interface WidgetQueueItem {
    view: __esri.View;
    getWidget: () => __esri.Widget | HTMLElement | string;
    position: __esri.UIAddComponent['position'];
    ready: boolean;
}

// Because the widgets load asynchronously, it's unpredictable when view.ui.add() gets called normally.
// This solves that problem by adding the widgets to a queue as they are initialized by React,
// and once they have all finished loading, THEN we add them to the UI in the order they
// are initialized by React. This makes it possible to control their locations by how
// you order them as components inside of a map.
let widgetQueue: WidgetQueueItem[] = [];
function queueWidget(view: __esri.View, getWidget: () => __esri.Widget | HTMLElement | string, position: __esri.UIAddComponent['position']) {
    const record = { view, getWidget, position, ready: false };
    widgetQueue.push(record);
    return function onReady() {
        record.ready = true;
        if (widgetQueue.every(t => t.ready)) {
            widgetQueue.forEach(t => t.view.ui.add(t.getWidget(), t.position));
            widgetQueue = [];
        }
    }
}

export function Widget<T extends GenericWidgetConstructorKeys>(props: WidgetProperties<T>) {
    console.log(`Widget '${props.id}' entry`);
    React.useEffect(() => {
        console.log(`Widget '${props.id}' useEffect`);
        let widget: __esri.Widget | undefined;
        let onReady = () => {};
        if (WidgetProperties.isUIWidget(props)) onReady = queueWidget(props.view!, () => widget!, props.position);
        (async function () {
            const widgetInitializer = initDefinitions.find(i => i.type === props.type);
            if (widgetInitializer) widget = await widgetInitializer.init(props, true);
            else {
                const [ WidgetConstructor ] = await loadTypedModules(props.type);
                widget = new WidgetConstructor(buildWidgetProps(props, true) as __esri.WidgetProperties);
            }
            if (props.init) props.init(widget as ConstructorInstance<EsriTypeMap[T]>);
            onReady();
        })();

        return function cleanup() {
            console.log(`Widget '${props.id}' cleanup`);
            if (widget) { 
                if (WidgetProperties.isDOMWidget(props)) {
                    if (props.container instanceof HTMLElement) props.container.innerHTML = '';
                    else {
                        const container = document.getElementById(props.container);
                        container!.innerHTML = '';
                    }
                } else props.view?.ui.remove(widget);
            }
        }
    });

    return null;
}

export function ExpandableWidget<T extends GenericWidgetConstructorKeys>(props: ExpandableWidgetProperties<T>) {
    console.log(`ExpandableWidget '${props.id}' entry`);
    React.useEffect(() => {
        console.log(`ExpandableWidget '${props.id}' useEffect`);
        let expand: __esri.Expand | undefined;
        let onReady = () => {};
        if (WidgetProperties.isUIWidget(props)) onReady = queueWidget(props.view!, () => expand!, props.position);
        (async function () {
            let widget: __esri.Widget;
            const widgetInitializer = initDefinitions.find(i => i.type === props.type);
            if (widgetInitializer) widget = await widgetInitializer.init(props, false);
            else {
                const [ WidgetConstructor ] = await loadTypedModules(props.type);
                widget = new WidgetConstructor(buildWidgetProps(props as WidgetProperties<T>, false) as __esri.WidgetProperties);
            }
            const [ Expand ] = await loadTypedModules('esri/widgets/Expand');

            expand = new Expand({
                content: widget,
                container: (WidgetProperties.isDOMWidget(props) ? props.container : undefined),
                ...props.expandProperties
            });
            onReady();
        })();

        return function cleanup() {
            console.log(`ExpandableWidget '${props.id}' cleanup`);
            if (expand) { 
                if (WidgetProperties.isDOMWidget(props)) {
                    if (props.container instanceof HTMLElement) props.container.innerHTML = '';
                    else {
                        const container = document.getElementById(props.container);
                        container!.innerHTML = '';
                    }
                } else props.view?.ui.remove(expand);
            }
        }
    });

    return null;
}

interface ExpandableHTMLProperties {
    view?: __esri.View;
    map?: __esri.Map;
    children?: JSX.Element | string | HTMLElement;
    position?: __esri.UIAddComponent['position'];
    expandProperties?: Optional<Remove<__esri.ExpandProperties, 'content' | 'view'>>;
}
export function ExpandableHTML(props: ExpandableHTMLProperties) {
    console.log('ExpandableHTML entry');
    React.useEffect(() => {
        console.log('ExpandableHTML useEffect');
        let expand: __esri.Expand | undefined;
        const onReady = queueWidget(props.view!, () => expand!, props.position);
        (async function () {
            const [ Expand ] = await loadTypedModules('esri/widgets/Expand');

            let content: string | Node | undefined;
            if (typeof props.children === 'string' || typeof props.children === 'undefined' || props.children instanceof HTMLElement) {
                content = props.children;
            } else content = renderToStaticMarkup(props.children);

            expand = new Expand({
                content,
                ...props.expandProperties
            });
            onReady();
        })();

        return function cleanup() {
            console.log('ExpandableHTML cleanup');
            if (expand) props.view?.ui.remove(expand);
        }
    });

    return null;
}

interface HTMLProperties {
    view?: __esri.View;
    map?: __esri.Map;
    children: JSX.Element | string | HTMLElement;
    position?: __esri.UIAddComponent['position'];
}

export function HTML(props: HTMLProperties) {
    console.log('HTML entry');
    React.useEffect(() => {
        console.log('HTML useEffect');
        let content = props.children;

        if (typeof content !== 'string' && !(content instanceof HTMLElement)) {
            content = renderToStaticMarkup(content);
        }

        if (typeof content === 'string') {
            const dummy = document.createElement('div');
            dummy.innerHTML = content;
            content = dummy.children[0] as HTMLElement;
        }
        
        queueWidget(props.view!, () => content as HTMLElement, props.position)();

        return function cleanup() {
            console.log('HTML cleanup');
            props.view?.ui.remove(content as HTMLElement);
        }
    });

    return null;
}

function buildWidgetProps<T extends GenericWidgetConstructorKeys>(props: WidgetProperties<T>, includeContainer: boolean) {
    return {
        view: props.view,
        id: props.id,
        container: (includeContainer && WidgetProperties.isDOMWidget(props) ? props.container : undefined),
        ...props.widgetProperties
    } as Diff<FirstConstructorArgument<EsriTypeMap[T]>, undefined>;
}

interface WidgetInitDefinition {
    type: GenericWidgetConstructorKeys;
    init(props: WidgetProperties<any>, includeContainer: boolean): Promise<__esri.Widget>;
}
const initDefinitions: WidgetInitDefinition[] = [
    {
        type: 'esri/widgets/Fullscreen',
        async init(props: WidgetProperties<'esri/widgets/Fullscreen'>, includeContainer: boolean) {
            const [ Fullscreen, watchUtils ] = await loadTypedModules(props.type, 'esri/core/watchUtils')
            const widgetProperties = buildWidgetProps(props, includeContainer);
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
        async init(props: WidgetProperties<'esri/widgets/Sketch'>, includeContainer: boolean) {
            const [ layer, [ Sketch ]] = await Promise.all([mapSpy.getLayer<__esri.GraphicsLayer>(props.map!, props.layer), loadTypedModules(props.type)]);
            const widgetProperties = buildWidgetProps(props, includeContainer);
            widgetProperties.layer = layer;
            return new Sketch(widgetProperties);
        }
    }, {
        type: 'esri/widgets/Editor',
        async init(props: WidgetProperties<'esri/widgets/Editor'>, includeContainer: boolean) {
            const [ Editor ] = await loadTypedModules(props.type);
            
            const widgetProperties = buildWidgetProps(props, includeContainer);
            if (props.layers) {
                const allLayers = await mapSpy.getLayers(props.view!);
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
        async init(props: WidgetProperties<'esri/widgets/FeatureTable'>, includeContainer: boolean) {
            const [ layer, [ FeatureTable, watchUtils ]] = await Promise.all([mapSpy.getLayer<__esri.FeatureLayer>(props.map!, props.layer), loadTypedModules(props.type, 'esri/core/watchUtils')]);
            const widgetProperties = buildWidgetProps(props, includeContainer);
            widgetProperties.layer = layer;
            widgetProperties.fieldConfigs = layer?.fields.map(f => ({ name: f.name, label: f.alias }));
            const widget = new FeatureTable(widgetProperties);

            watchUtils.whenFalse(props.view!, 'updating', () => {
                const extent = (props.view as __esri.MapView).extent
                if (extent) {
                    widget.filterGeometry = extent;
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

            props.view!.on('immediate-click', event => {
                (props.view as __esri.MapView).hitTest(event).then(response => {
                    const candidate = response.results.find(result => result.graphic && result.graphic.layer === layer);
                    candidate && widget.selectRows(candidate!.graphic);
                });
            });

            return widget;
        }
    }
];