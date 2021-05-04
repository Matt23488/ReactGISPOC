import React from 'react';
import { EsriTypeMap, loadTypedModules } from './utilities/GIS';
import { topic } from './utilities/Topic';

type PropertyPicker<T> = T extends { new(props: infer U, ...params: never[]): any } ? U : never;
type InstancePicker<T> = T extends { new(...params: never[]): infer U } ? U : never;


type LayerConstructorKeys = Diff<({
    [T in keyof EsriTypeMap]: EsriTypeMap[T] extends { new(...params: never[]): __esri.Layer } ? T : never;
})[keyof EsriTypeMap], 'esri/layers/Layer' | 'esri/layers/FeatureLayer'>;
type LayerPropertiesTypeMap = {
    [T in LayerConstructorKeys]: Diff<PropertyPicker<EsriTypeMap[T]>, undefined>
};

type Diff<T, U> = T extends U ? never : T;
type Remove<T, U> = { [K in Diff<keyof T, U> ]: T[K] };
type Optional<T> = { [U in keyof T]?: T[U] };

interface LayerProperties<T extends LayerConstructorKeys> {
    type: T;
    url: string;
    layerProperties?: Optional<Remove<LayerPropertiesTypeMap[T], 'view' | 'map' | 'url'>>;
    view?: __esri.View;
    map?: __esri.Map;
    init?: (layer: InstancePicker<EsriTypeMap[T]>) => void;
}

interface LayerQueueItem {
    map: __esri.Map;
    getLayer: () => __esri.Layer;
    ready: boolean;
}

// Because the widgets load asynchronously, it's unpredictable when view.ui.add() gets called normally.
// This solves that problem by adding the widgets to a queue as they are initialized by React,
// and once they have all finished loading, THEN we add them to the UI in the order they
// are initialized by React. This makes it possible to control their locations by how
// you order them as components inside of a map.
let layerQueue: LayerQueueItem[] = [];
function queueLayer(map: __esri.Map, getLayer: () => __esri.Layer) {
    const record = { map, getLayer, ready: false };
    layerQueue.push(record);
    return function onReady() {
        record.ready = true;
        const layer = getLayer();
        topic.publish(`layerLoad/${map.get('lookupId')}/${layer.id}`, layer);
        if (layerQueue.every(t => t.ready)) {
            layerQueue.forEach(t => map.add(t.getLayer()));
            layerQueue = [];
        }
    }
}

// TODO: I don't think this is going to work like the Widgets.
// The different layer types are too different I think for this to be
// feasible. Need to create a component for each layer type I wish to support I think.
export function Layer<T extends LayerConstructorKeys>(props: LayerProperties<T>) {
    React.useEffect(() => {
        let layer: __esri.Layer | undefined;
        const onReady = queueLayer(props.map!, () => layer!);
        (async function () {
            const [ LayerConstructor ] = await loadTypedModules(props.type);
            const layerProperties = { url: props.url, ...props.layerProperties } as __esri.LayerProperties;
            
            layer = new LayerConstructor(layerProperties);
            if (props.init) props.init(layer as InstancePicker<EsriTypeMap[T]>);
            onReady();
        })();

        return function cleanup() {
            if (layer) props.map?.remove(layer);
        }
    });

    return null;
}

interface FeatureLayerProperties {
    map?: __esri.Map;
    view?: __esri.View;
    url: string;
    id?: string;
    title?: string;
}

export function FeatureLayer(props: FeatureLayerProperties) {
    console.log('FeatureLayer entry');
    React.useEffect(() => {
        console.log('FeatureLayer useEffect');
        let layer: __esri.FeatureLayer | undefined;
        const onReady = queueLayer(props.map!, () => layer!);
        (async function () {
            const [FeatureLayerConstructor] = await loadTypedModules('esri/layers/FeatureLayer');

            layer = new FeatureLayerConstructor({ url: props.url, id: props.id, title: props.title });
            onReady();
        })();

        return function cleanup() {
            console.log('FeatureLayer cleanup');
            if (layer) props.map?.remove(layer);
        }
    });

    return null;
}

interface GraphicsLayerProperties {
    map?: __esri.Map;
    view?: __esri.View;
    id?: string;
    title?: string;
}

export function GraphicsLayer(props: GraphicsLayerProperties) {
    console.log('GraphicsLayer entry');
    React.useEffect(() => {
        console.log('GraphicsLayer useEffect');
        let graphicsLayer: __esri.GraphicsLayer | undefined;
        const onReady = queueLayer(props.map!, () => graphicsLayer!);
        (async function () {
            const [GraphicsLayerConstructor] = await loadTypedModules('esri/layers/GraphicsLayer');

            // const test = await getWidget(props.view!, 'testSketch');
            // const test = await MapContext.getWidget(props.view!, 'testSketch');
            // console.log('GraphicsLayer got testSketch', test);
            graphicsLayer = new GraphicsLayerConstructor({ id: props.id, title: props.title });
            onReady();
        })();

        return function cleanup() {
            console.log('GraphicsLayer cleanup');
            if (graphicsLayer) props.map?.remove(graphicsLayer);
        }
    });

    return null;
}