import React, { ChangeEvent } from 'react';
// import logo from './logo.svg';
import './App.css';
import { setDefaultOptions } from 'esri-loader';
import settings from './appsettings';
import { fetchToken, MapChild } from './utilities/GIS';
import { MapComponent, Widget } from './Widget/Widgets';
import { FeatureLayer, GraphicsLayer } from './Layers';
import { MapContext, MapProvider, WebMap } from './Map';
import { Optional } from './utilities/Types';
import { WidgetProperties } from './Widget/WidgetTypes';

setDefaultOptions({ css: true });

async function getAGOLToken() {
    const token = await fetchToken();
    return {
        server: 'https://www.arcgis.com/sharing/rest',
        token: token.access_token
    };
}

async function getGRPToken() {
    const options = {
        username: settings.grpAuth.user,
        password: settings.grpAuth.password,
        client: 'requestip',
        expiration: '20160',
        f: 'json'
    } as { [key: string]: string };
    const params = [];
    for (let key in options) {
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(options[key])}`)
    }

    const tokenRes = await fetch(settings.grpAuth.tokenURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.join('&')
    });

    const tokenData = await tokenRes.json();
    return {
        token: tokenData.token,
        server: 'https://test-maps.kytc.ky.gov/arcgis/rest/services'
    };
}

function App() {
    const testHtml = document.createElement('div');
    testHtml.innerText = 'Hello from HTMLElement!';
    testHtml.style.cssText = 'background-color: white; padding: 20px;';
    const btn = document.createElement('button');
    btn.innerText = 'Click Me';
    btn.addEventListener('click', () => alert('yo'));
    testHtml.appendChild(btn);

    return (
        <div className="App">
            <SidePanelLayout panel={
                <MapProvider mapId="testMap">
                    <div style={{ border: '1px solid black' }}>
                        <h1>Legend:</h1>
                        <Widget type="esri/widgets/Legend" />
                    </div>

                    {/* <Widget type="esri/widgets/FeatureTable" /> */}
                </MapProvider>
            } map={
                <WebMap id="testMap" portalId="22813abda6cd4058b4c4d0f593671737" portalUrl={settings.portalURL} tokenFetchers={[ getAGOLToken, getGRPToken ]}>
                    <MapComponent expandable={true} position="top-right" expandProperties={{ expandTooltip: 'Basemap Gallery', expandIconClass: 'esri-icon-basemap' }}>
                        <Widget type="esri/widgets/BasemapGallery" id="basemapGalleryWidget" />
                        <p>sup</p>
                    </MapComponent>
                    <MapComponent expandable={true} position="top-right" expandProperties={{ expandTooltip: 'Layer List', expandIconClass: 'esri-icon-layer-list' }}>
                        <Widget type="esri/widgets/LayerList" id="layerListWidget" />
                    </MapComponent>
                    <MapComponent expandable={true} position="top-right" expandProperties={{ expandTooltip: 'Basemap Layer List', expandIconClass: 'esri-icon-layer-list' }}>
                        <Widget type="esri/widgets/BasemapLayerList" id="basemapLayerListWidget" />
                    </MapComponent>
                    <MapComponent expandable={true} position="top-right" expandProperties={{ expandTooltip: 'Editor', expandIconClass: 'esri-icon-favorites' }}>
                        <Widget type="esri/widgets/Editor" id="editorWidget" layers={[ 'grpLayer' ]} />
                    </MapComponent>
                    <MapComponent expandable={true} position="top-right" expandProperties={{ expandTooltip: 'Sketch', expandIconClass: 'esri-icon-edit' }}>
                        <Widget type="esri/widgets/Sketch" id="sketchWidget" layer="sketchLayer" />
                    </MapComponent>
                    <MapComponent position="top-left">
                        <Widget type="esri/widgets/Home" id="homeWidget" />
                    </MapComponent>
                    <MapComponent position="top-left">
                        <Widget type="esri/widgets/Fullscreen" id="fullscreenWidget" />
                    </MapComponent>
                    <MapComponent position="bottom-left">
                        <Widget type="esri/widgets/ScaleBar" id="scaleBarWidget" />
                    </MapComponent>
                    <MapComponent position="top-left" expandable={true} expandProperties={{ expandTooltip: 'React Component' }} style={{ backgroundColor: 'white', padding: '20px', minWidth: '100%' }}>
                        Hello from MapComponent! React components DO work:
                        <ReactComponentTest layer="keptLayer" />
                    </MapComponent>
                    <MapComponent position="top-left" style={{ backgroundColor: 'white', padding: '20px' }}>
                        Hello from MapComponent! React components DO work:
                        <ReactComponentTest layer="grpLayer" />
                    </MapComponent>
                    <MapComponent position="manual" style={{ left: '59px', top: '173px' }}>
                        <button className="map-ui-btn">&hearts;</button>
                    </MapComponent>
                    <MapComponent position="top-right" expandable={true} expandProperties={{ expandTooltip: 'Print', expandIconClass: 'esri-icon-printer' }}>
                        <Widget type="esri/widgets/Print" widgetProperties={{ printServiceUrl: settings.printServiceURL } as any} />
                    </MapComponent>


                    <GraphicsLayer id="sketchLayer" title="Sketch Layer" />
                    <FeatureLayer url={settings.projectLayerURL} id="ahpLayer" title="Active Highway Plan" />
                    <FeatureLayer url={settings.grpURL} id="grpLayer" title="Proposed Guardrail" />
                    <FeatureLayer url="https://test-maps.kytc.ky.gov/arcgis/rest/services/Apps/KEPTSAppEdit/FeatureServer/2" id="keptLayer" title="KEPT" />
                </WebMap>
            } />
        </div>
    );
}

function SidePanelLayout(props: { panel: React.ReactNode, map: React.ReactNode }) {
    return (
        <>
            <div className="side-panel">
                {props.panel}
            </div>
            <div className="map-panel">
                {props.map}
            </div>
        </>
    );
}

export default App;

interface ReactComponentTestProperties extends Optional<MapChild> {
    layer: string;
}

interface ReactComponentTestState {
    feature: any;
    value: number;
    inspector: string;
    layer?: __esri.FeatureLayer;
}
class ReactComponentTest extends React.Component<ReactComponentTestProperties, ReactComponentTestState> {
    static contextType = MapContext;

    public constructor(props: ReactComponentTestProperties) {
        super(props);

        this.state = {
            feature: null,
            value: 0,
            inspector: '',
        };
    }

    public async componentDidMount() {
        await this.context.view.when();
        const layer = this.context.map.findLayerById(this.props.layer) as __esri.FeatureLayer;
        this.setState({ layer });
    }

    private onIncrement() {
        this.setState({ value: this.state.value + 1 });
    }

    private onInspectorChange(event: ChangeEvent<HTMLInputElement>) {
        this.setState({ inspector: event.target.value });
    }

    private onQuery() {
        if (this.state.layer && this.state.layer.type === 'feature') {
            const query = this.state.layer.createQuery();
            query.where = `InspectedBy='${this.state.inspector}'`;
            query.outFields = ["*"];
            query.num = 1;

            this.state.layer.queryFeatures(query).then(features => {
                let feature: any;
                if (features.features[0]) feature = features.features[0].attributes;
                this.setState({ feature });
            });
        }
    }

    public render () {
        return (
            <div>
                <p>Current value: {this.state.value}</p>
                <button onClick={this.onIncrement.bind(this)}>Increment</button>
                <br />
                Inspector:
                <input type="text" value={this.state.inspector} onChange={this.onInspectorChange.bind(this)} />
                <button onClick={this.onQuery.bind(this)}>Query</button>
                <pre><code>
                    {this.state.feature ? JSON.stringify(this.state.feature, null, 2) : `No Inspector '${this.state.inspector}'`}
                </code></pre>
            </div>
        );
    }
}