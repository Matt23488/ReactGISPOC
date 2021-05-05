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
            widgetQueue.forEach(t => t.view.ui.add(t.getWidget(), { position: t.position }));
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
            const [ WidgetConstructor ] = await loadTypedModules(props.type);
            
            let widgetProperties: __esri.WidgetProperties;
            const constructionPrepItem = constructionPrep.find(obj => obj.type === props.type);
            if (constructionPrepItem) widgetProperties = await constructionPrepItem.buildContructorParam(props);
            else widgetProperties = { view: props.view, id: props.id, container: (WidgetProperties.isDOMWidget(props) ? props.container : undefined), ...props.widgetProperties } as __esri.WidgetProperties;
            
            widget = new WidgetConstructor(widgetProperties);
            specialInitFunctions.find(obj => obj.type === props.type)?.init(widget);
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
            const [ Expand, WidgetConstructor ] = await loadTypedModules('esri/widgets/Expand', props.type);
            
            let widgetProperties: __esri.WidgetProperties;
            const constructionPrepItem = constructionPrep.find(obj => obj.type === props.type);
            if (constructionPrepItem) widgetProperties = await constructionPrepItem.buildContructorParam(props);
            else widgetProperties = { view: props.view, id: props.id, ...props.widgetProperties } as __esri.WidgetProperties;

            const widget = new WidgetConstructor(widgetProperties);
            specialInitFunctions.find(obj => obj.type === props.type)?.init(widget);
            if (props.init) props.init(widget as ConstructorInstance<EsriTypeMap[T]>);

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

interface WidgetContructionPrep {
    type: GenericWidgetConstructorKeys;
    buildContructorParam: (props: any) => Promise<{}>;
}

const constructionPrep: WidgetContructionPrep[] = [
    {
        type: 'esri/widgets/Sketch',
        buildContructorParam: async (props: WidgetProperties<'esri/widgets/Sketch'>) => {
            const layer = await mapSpy.getLayer<__esri.GraphicsLayer>(props.map!, props.layer);
            return { view: props.view, id: props.id, layer, ...props.widgetProperties };
        }
    }, {
        type: 'esri/widgets/Editor',
        buildContructorParam: async (props: WidgetProperties<'esri/widgets/Editor'>) => {
            
            let layerInfos: __esri.LayerInfo[] | undefined;
            if (props.layers) {
                const allLayers = await mapSpy.getLayers(props.view!);
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
            }

            return { view: props.view, id: props.id, layerInfos, ...props.widgetProperties };
        }
    }, {
        type: 'esri/widgets/FeatureTable',
        buildContructorParam: async (props: WidgetProperties<'esri/widgets/FeatureTable'>) => {
            const layer = await mapSpy.getLayer<__esri.FeatureLayer>(props.map!, props.layer);
            return {
                view: props.view,
                id: props.id,
                layer,
                fieldConfigs: layer?.fields.map(f => ({ name: f.name, label: f.alias })),
                ...props.widgetProperties };
        }
    }
];