import React from 'react';
import { loadTypedModules } from './utilities/GIS';


interface LayerQueueItem {
    map: __esri.Map;
    getLayer: () => __esri.Layer;
    ready: boolean;
}

// Because the widgets load asynchronously, it's unpredictable when map.add() gets called normally.
// This solves that problem by adding the layers to a queue as they are initialized by React,
// and once they have all finished loading, THEN we add them to the map in the order they
// are initialized by React. This makes it possible to control their order by how
// you order them as components inside of a map.
let layerQueue: LayerQueueItem[] = [];
function queueLayer(map: __esri.Map, getLayer: () => __esri.Layer) {
    const record = { map, getLayer, ready: false };
    layerQueue.push(record);
    return function onReady() {
        record.ready = true;
        if (layerQueue.every(t => t.ready)) {
            layerQueue.forEach(t => map.add(t.getLayer()));
            layerQueue = [];
        }
    }
}

// TODO: I don't think this is going to work like the Widgets.
// The different layer types are too different I think for this to be
// feasible. Need to create a component for each layer type I wish to support I think.
// interface LayerProperties<T extends LayerConstructorKeys> {
//     type: T;
//     url: string;
//     layerProperties?: Optional<Remove<LayerPropertiesTypeMap[T], 'view' | 'map' | 'url'>>;
//     view?: __esri.View;
//     map?: __esri.Map;
//     init?: (layer: InstancePicker<EsriTypeMap[T]>) => void;
// }
// export function Layer<T extends LayerConstructorKeys>(props: LayerProperties<T>) {
//     React.useEffect(() => {
//         let layer: __esri.Layer | undefined;
//         const onReady = queueLayer(props.map!, () => layer!);
//         (async function () {
//             const [ LayerConstructor ] = await loadTypedModules(props.type);
//             const layerProperties = { url: props.url, ...props.layerProperties } as __esri.LayerProperties;
            
//             layer = new LayerConstructor(layerProperties);
//             if (props.init) props.init(layer as InstancePicker<EsriTypeMap[T]>);
//             onReady();
//         })();

//         return function cleanup() {
//             if (layer) props.map?.remove(layer);
//         }
//     });

//     return null;
// }

interface FeatureLayerProperties {
    map?: __esri.Map;
    view?: __esri.View;
    url: string;
    id?: string;
    title?: string;
}

export function FeatureLayer(props: FeatureLayerProperties) {
    console.log(`FeatureLayer '${props.id}' entry`);
    React.useEffect(() => {
        console.log(`FeatureLayer '${props.id}' useEffect`);
        let layer: __esri.FeatureLayer | undefined;
        const onReady = queueLayer(props.map!, () => layer!);
        (async function () {
            const [FeatureLayerConstructor] = await loadTypedModules('esri/layers/FeatureLayer');

            layer = new FeatureLayerConstructor({ url: props.url, id: props.id, title: props.title });
            onReady();
        })();

        return function cleanup() {
            console.log(`FeatureLayer '${props.id}' cleanup`);
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
    console.log(`GraphicsLayer '${props.id}' entry`);
    React.useEffect(() => {
        console.log(`GraphicsLayer '${props.id}' useEffect`);
        let graphicsLayer: __esri.GraphicsLayer | undefined;
        const onReady = queueLayer(props.map!, () => graphicsLayer!);
        (async function () {
            const [GraphicsLayerConstructor] = await loadTypedModules('esri/layers/GraphicsLayer');

            graphicsLayer = new GraphicsLayerConstructor({ id: props.id, title: props.title });
            onReady();
        })();

        return function cleanup() {
            console.log(`GraphicsLayer '${props.id}' cleanup`);
            if (graphicsLayer) props.map?.remove(graphicsLayer);
        }
    });

    return null;
}