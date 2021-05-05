import React from 'react';
import { topic } from './utilities/Topic';

interface MagicProperties {
    map?: __esri.Map;
    view?: __esri.View;
}

export default class Magic extends React.Component<MagicProperties> {
    public async componentDidMount() {
        await this.props.view!.when();
        console.log(`Map '${this.props.map!.get('lookupId')}' loaded`);
        _maps.set(this.props.map!.get('lookupId'), this.props.map!);
        topic.publish(`map-load/${this.props.map!.get('lookupId')}`, this.props.map);

        this.props.view!.on('layerview-create', async e => {
            await e.layer.when();
            console.log(`Layer '${e.layer.id}' loaded on Map '${this.props.map!.get('lookupId')}'`);
            _layers.set(`${this.props.map!.get('lookupId')}-${e.layer.id}`, e.layer);
            topic.publish(`layer-load/${this.props.map!.get('lookupId')}/${e.layer.id}`, e.layer);
        });
    }

    public render() { return null; }
}

const _maps = new Map<string, __esri.Map>();
export function getMap<T extends __esri.Map>(mapId: string, timeout = 10000) {
    return new Promise<T | undefined>(resolve => {
        if (_maps.has(mapId)) resolve(_maps.get(mapId) as T);
        else {
            const timeoutHandle = window.setTimeout(resolve, timeout);
            const handle = topic.subscribe<T>(`map-load/${mapId}`, map => {
                topic.unsubscribe(handle);
                window.clearTimeout(timeoutHandle);
                resolve(map);
            });
        }
    });
}

const _layers = new Map<string, __esri.Layer>();
export function getLayer<T extends __esri.Layer>(mapId: string, layerId: string, timeout?: number): Promise<T | undefined>;
export function getLayer<T extends __esri.Layer>(map: __esri.Map, layerId: string, timeout?: number): Promise<T | undefined>;
export function getLayer<T extends __esri.Layer>(map: string | __esri.Map, layerId: string, timeout = 10000) {
    return new Promise<T | undefined>(async resolve => {
        if (typeof map !== 'string') map = map.get('lookupId') as string;

        const id = `${map}-${layerId}`;
        if (_layers.has(id)) resolve(_layers.get(id) as T);
        else {
            const timeoutHandle = window.setTimeout(resolve, timeout);
            const handle = topic.subscribe<T>(`layer-load/${map}/${layerId}`, layer => {
                topic.unsubscribe(handle);
                window.clearTimeout(timeoutHandle);
                resolve(layer);
            });
        }
    });
}

export function getLayers(view: __esri.View, timeout = 10000) {
    return new Promise<__esri.Layer[] | undefined>(resolve => {
        const timeoutHandle = window.setTimeout(resolve, timeout);
        view.when(async () => {
            const layers = view.map.layers.toArray();
            await Promise.all(layers.map(l => l.when()));
            window.clearTimeout(timeoutHandle);
            resolve(layers);
        });
    });
}

const _widgets = new Map<string, __esri.Widget>();
export function getWidget<T extends __esri.Widget>(mapId: string, widgetId: string, timeout?: number): Promise<T | undefined>;
export function getWidget<T extends __esri.Widget>(map: __esri.Map, widgetId: string, timeout?: number): Promise<T | undefined>;
export function getWidget<T extends __esri.Widget>(map: string | __esri.Map, widgetId: string, timeout = 10000) {
    return new Promise<T | undefined>(resolve => {
        if (typeof map !== 'string') map = map.get('lookupId') as string;

        const id = `${map}-${widgetId}`;
        if (_widgets.has(id)) resolve(_widgets.get(id) as T);
        else {
            const timeoutHandle = window.setTimeout(resolve, timeout);
            const handle = topic.subscribe<T>(`widget-load/${map}/${widgetId}`, widget => {
                topic.unsubscribe(handle);
                window.clearTimeout(timeoutHandle);
                resolve(widget);
            });
        }
    });
}

export function getWidgets(view: __esri.View, timeout = 10000) {
    return new Promise<__esri.Widget[] | undefined>(resolve => {
        const timeoutHandle = window.setTimeout(resolve, timeout);
        view.when(async () => {
            window.clearTimeout(timeoutHandle);
            const widgets = view.ui.components.map(c => view.ui.find(c)).filter(c => !(c instanceof HTMLElement)) as __esri.Widget[];
            resolve(widgets);
        });
    });
}