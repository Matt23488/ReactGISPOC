import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { loadTypedModules, MapChild } from './utilities/GIS';
import { Map as EsriMap, WebMap as EsriWebMap } from '@esri/react-arcgis';
import DOMContainer from './utilities/DomContainer';

interface CommonProperties {
    portalUrl?: string;
    children?: React.ReactNode | React.ReactNodeArray;
    id: string;
    tokenFetchers?: Array<() => Promise<{ server: string, token: string }>>;
    onFail?: (e: any) => any;
}

interface MapProperties extends CommonProperties {
    onLoad?: (map: __esri.Map, view: __esri.MapView | __esri.SceneView) => void;
}

interface WebMapProperties extends CommonProperties {
    portalId: string;
    onLoad?: (map: __esri.WebMap, view: __esri.MapView | __esri.SceneView) => void;
}

function mapNeedsInit(props: CommonProperties) {
    return !!props.portalUrl
        || !!props.tokenFetchers;
}

async function initMap(props: CommonProperties) {
    const [esriConfig, esriId] = await loadTypedModules('esri/config', 'esri/identity/IdentityManager');

    if (props.portalUrl) {
        esriConfig.portalUrl = props.portalUrl;
    }

    if (props.tokenFetchers) {
        const tokens = await Promise.all(props.tokenFetchers.map(f => f()));
        tokens.forEach(t => esriId.registerToken(t));
    }
}

interface MapState {
    mapReady: boolean;
    context?: MapChild;
}

export const MapContext = React.createContext<MapChild>({ map: {} as __esri.Map, view: {} as __esri.View });

const _contexts = new window.Map<string, { context?: MapChild, resolve: (context: MapChild) => void }>();
export function getContext(mapId: string) {
    const context = _contexts.get(mapId);
    if (!context) {
        return new Promise<MapChild>(resolve => {
            _contexts.set(mapId, { resolve });
        });
    } else return Promise.resolve(context.context!);
}

function addContext(mapId: string, context: MapChild) {
    const existing = _contexts.get(mapId);
    if (existing) {
        existing.context = context;
        existing.resolve(context);
    } else _contexts.set(mapId, { context, resolve: () => context });
}

export class Map extends React.Component<MapProperties, MapState> {
    public constructor(props: MapProperties) {
        super(props);

        this.state = {
            mapReady: !mapNeedsInit(props),
        };
    }

    public async componentDidMount() {
        if (this.state.mapReady) return;

        await initMap(this.props);
        this.setState({ mapReady: true });
    }

    private onLoad(map: __esri.Map, view: __esri.MapView | __esri.SceneView) {
        addContext(this.props.id, { map, view });
        if (this.props.onLoad) this.props.onLoad(map, view);
        this.setState({ context: { map, view } });
    }

    private onFail(e: any) {
        if (this.props.onFail) this.props.onFail(e);
    }

    public render() {
        return this.state.mapReady ? (
            <EsriMap onLoad={this.onLoad.bind(this)} onFail={this.onFail.bind(this)}>
                {this.state.context ? (
                    <MapContext.Provider value={this.state.context}>
                        {this.props.children}
                    </MapContext.Provider>
                ) : null}
            </EsriMap>
        ) : <p>Loading...</p>;
    }
}

export class WebMap extends React.Component<WebMapProperties, MapState> {
    public constructor(props: WebMapProperties) {
        super(props);

        this.state = {
            mapReady: !mapNeedsInit(props),
        };
    }

    public async componentDidMount() {
        if (this.state.mapReady) return;

        await initMap(this.props);
        this.setState({ mapReady: true });
    }

    private onLoad(map: __esri.Map, view: __esri.MapView | __esri.SceneView) {
        addContext(this.props.id, { map, view });
        if (this.props.onLoad) this.props.onLoad(map as __esri.WebMap, view);
        this.setState({ context: { map, view } });
    }

    private onFail(e: any) {
        if (this.props.onFail) this.props.onFail(e);
    }

    public render() {
        return this.state.mapReady ? (
            <EsriWebMap id={this.props.portalId} onLoad={this.onLoad.bind(this)} onFail={this.onFail.bind(this)}>
                {this.state.context ? (
                    <MapContext.Provider value={this.state.context}>
                        {this.props.children}
                    </MapContext.Provider>
                ) : null}
            </EsriWebMap>
        ) : <p>Loading...</p>;
    }
}

interface MapProviderProperties {
    children: React.ReactNode | React.ReactNodeArray;
    className?: string;
    style?: React.CSSProperties;
    mapId: string;
}

interface MapProviderState {
    domId: string;
    context?: MapChild;
};

export class MapProvider extends React.Component<MapProviderProperties, MapProviderState> {
    public constructor(props: MapProviderProperties) {
        super(props);

        this.state = { domId: uuidv4()  };
    }

    public async componentDidMount() {
        try {
            const context = await getContext(this.props.mapId);
            if (!context) throw new Error(`Couldn't find map ${this.props.mapId}`);
            await context.view.when();
            
            this.setState({ context });
        } catch (e) {
            console.error(e);
        }
    }

    public render() {
        if (!this.state.context) return null;
        
        // TODO: don't set height here. Leave styling up to consumer.
        return (
            <DOMContainer domId={this.state.domId} className={this.props.className} style={{ ...this.props.style, height: '100%' }}>
                <MapContext.Provider value={this.state.context}>
                    {this.props.children}
                </MapContext.Provider>
            </DOMContainer>
        );
    }
}