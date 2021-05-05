import React from 'react';
import { loadTypedModules } from './utilities/GIS';
import { Map as EsriMap, WebMap as EsriWebMap } from '@esri/react-arcgis';
import MapSpy from './MapSpy';

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
    ready: boolean;
}

export class Map extends React.Component<MapProperties, MapState> {
    public constructor(props: MapProperties) {
        super(props);

        this.state = {
            ready: !mapNeedsInit(props)
        };
    }

    public async componentDidMount() {
        if (this.state.ready) return;

        await initMap(this.props);
        this.setState({ ready: true });
    }

    private onLoad(map: __esri.Map, view: __esri.MapView | __esri.SceneView) {
        map.set('lookupId', this.props.id);
        if (this.props.onLoad) this.props.onLoad(map, view);
    }

    private onFail(e: any) {
        if (this.props.onFail) this.props.onFail(e);
    }

    public render() {
        return this.state.ready ? (
            <EsriMap onLoad={this.onLoad.bind(this)} onFail={this.onFail.bind(this)}>
                <MapSpy />
                {this.props.children}
            </EsriMap>
        ) : <p>Loading...</p>;
    }
}

export class WebMap extends React.Component<WebMapProperties, MapState> {
    public constructor(props: WebMapProperties) {
        super(props);

        this.state = {
            ready: !mapNeedsInit(props)
        };
    }

    public async componentDidMount() {
        if (this.state.ready) return;

        await initMap(this.props);
        this.setState({ ready: true });
    }

    private onLoad(map: __esri.Map, view: __esri.MapView | __esri.SceneView) {
        map.set('lookupId', this.props.id);
        if (this.props.onLoad) this.props.onLoad(map as __esri.WebMap, view);
    }

    private onFail(e: any) {
        if (this.props.onFail) this.props.onFail(e);
    }

    public render() {
        return this.state.ready ? (
            <EsriWebMap id={this.props.portalId} onLoad={this.onLoad.bind(this)} onFail={this.onFail.bind(this)}>
                <MapSpy />
                {this.props.children}
            </EsriWebMap>
        ) : <p>Loading...</p>;
    }
}