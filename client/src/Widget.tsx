import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EsriTypeMap, loadTypedModules } from './utilities/GIS';

type PropertyPicker<T> = T extends { new(props: infer U, ...params: never[]): any } ? U : never;
type InstancePicker<T> = T extends { new(...params: never[]): infer U } ? U : never;


type WidgetConstructorKeys = ({
    [T in keyof EsriTypeMap]: EsriTypeMap[T] extends { new(...params: never[]): __esri.Widget } ? (T extends 'esri/widgets/Expand' ? never: T) : never;
})[keyof EsriTypeMap];
type WidgetPropertiesTypeMap = {
    [T in WidgetConstructorKeys]: Diff<PropertyPicker<EsriTypeMap[T]>, undefined>
};

type Diff<T, U> = T extends U ? never : T;
type Remove<T, U> = { [K in Diff<keyof T, U> ]: T[K] };
type Optional<T> = { [U in keyof T]?: T[U] };

interface WidgetProperties<T extends WidgetConstructorKeys> {
    type: T;
    widgetProperties?: Optional<Remove<WidgetPropertiesTypeMap[T], 'view'>>;
    view?: __esri.View;
    position?: __esri.UIAddComponent['position'];
    init?: (widget: InstancePicker<EsriTypeMap[T]>) => void;
}

interface ExpandableWidgetProperties<T extends WidgetConstructorKeys> extends WidgetProperties<T> {
    expandProperties?: Optional<Remove<__esri.ExpandProperties, 'content'>>;
}

interface ExpandableHTMLProperties {
    view?: __esri.View;
    content: JSX.Element;
    position?: __esri.UIAddComponent['position'];
    expandProperties?: Optional<Remove<__esri.ExpandProperties, 'content' | 'view'>>;
}

interface WidgetQueueItem {
    view: __esri.View;
    getWidget: () => __esri.Widget | undefined;
    position: __esri.UIAddComponent['position'];
    ready: boolean;
}

// Because the widgets load asynchronously, it's unpredictable when view.ui.add() gets called normally.
// This solves that problem by adding the widgets to a queue as they are initialized by React,
// and once they have all finished loading, THEN we add them to the UI in the order they
// are initialized by React. This makes it possible to control their locations by how
// you order them as components inside of a map.
let widgetQueue: WidgetQueueItem[] = [];
function queueWidget(view: __esri.View, getWidget: () => __esri.Widget | undefined, position: __esri.UIAddComponent['position']) {
    const record = { view, getWidget, position, ready: false };
    widgetQueue.push(record);
    return function onReady() {
        record.ready = true;
        if (widgetQueue.every(t => t.ready)) {
            widgetQueue.forEach(t => t.view.ui.add(t.getWidget()!, { position: t.position }));
            widgetQueue = [];
        }
    }
}

export function Widget<T extends WidgetConstructorKeys>(props: WidgetProperties<T>) {
    React.useEffect(() => {
        let widget: __esri.Widget | undefined;
        const onReady = queueWidget(props.view!, () => widget, props.position);
        (async function () {
            const [ WidgetConstructor ] = await loadTypedModules(props.type);
            const widgetProperties = { view: props.view, ...props.widgetProperties } as __esri.WidgetProperties;
            
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

export function ExpandableWidget<T extends WidgetConstructorKeys>(props: ExpandableWidgetProperties<T>) {
    React.useEffect(() => {
        let expand: __esri.Expand | undefined;
        const onReady = queueWidget(props.view!, () => expand, props.position);
        (async function () {
            const [ Expand, WidgetConstructor ] = await loadTypedModules('esri/widgets/Expand', props.type);
            const widgetProperties = { view: props.view, ...props.widgetProperties } as __esri.WidgetProperties;

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
        const onReady = queueWidget(props.view!, () => expand, props.position);
        (async function () {
            const [ Expand ] = await loadTypedModules('esri/widgets/Expand');

            expand = new Expand({
                content: renderToStaticMarkup(props.content),
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

interface SpecialInitItem {
    type: WidgetConstructorKeys,
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
            watchUtils.watch(widget.viewModel, "state", (value: __esri.FullscreenViewModel['state']) => {
                if (value === 'ready') {
                    widget.view.container.style.width = '100%';
                    widget.view.container.style.height = '100%';
                }
            });
        }
    }
];