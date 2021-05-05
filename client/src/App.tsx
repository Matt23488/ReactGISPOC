import React from 'react';
// import logo from './logo.svg';
import './App.css';
import { setDefaultOptions } from 'esri-loader';
import settings from './appsettings';
import { fetchToken } from './utilities/GIS';
import * as mapSpy from './MapSpy';
import { ExpandableHTML, ExpandableWidget, HTML, Widget } from './Widget';
import { FeatureLayer, GraphicsLayer } from './Layers';
import { WebMap } from './Map';

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
    testHtml.style.cssText = 'background-color: white; padding: 20px; width: 200px; height: 200px;';
    const btn = document.createElement('button');
    btn.innerText = 'Click Me';
    btn.addEventListener('click', () => alert('yo'));
    testHtml.appendChild(btn);

    return (
        <div className="App">
            <SidePanelLayout panel={
                <>
                    <CounterWithIncrement />
                    <br />
                    <div id="legendDiv"></div>
                    <div id="featureTableDiv"></div>
                </>
            } map={
                <WebMap id="testMap" portalId="22813abda6cd4058b4c4d0f593671737" portalUrl={settings.portalURL} tokenFetchers={[ getAGOLToken, getGRPToken ]}>
                    <ExpandableWidget id="basemapGalleryWidget" type="esri/widgets/BasemapGallery" position="top-right" expandProperties={{ expandTooltip: 'Basemap Gallery' }} />
                    <ExpandableWidget id="layerListWidget" type="esri/widgets/LayerList" position="top-right" expandProperties={{ expandTooltip: 'Layer List' }} />
                    <ExpandableWidget id="basemapLayerListWidget" type="esri/widgets/BasemapLayerList" position="top-right" expandProperties={{ expandTooltip: 'Basemap Layer List' }} />
                    <ExpandableWidget id="editorWidget" type="esri/widgets/Editor" position="top-right" layers={[ 'grpLayer']} expandProperties={{ expandTooltip: 'Editor', expandIconClass: 'esri-icon-favorites' }} />
                    <ExpandableWidget type="esri/widgets/Sketch" id="sketchWidget" layer="sketchLayer" position="top-right" expandProperties={{ expandTooltip: 'Sketch' }} />
                    <Widget id="homeWidget" type="esri/widgets/Home" position="top-left" />
                    <Widget id="fullscreenWidget" type="esri/widgets/Fullscreen" position="top-left" />
                    <Widget id="legendWidget" type="esri/widgets/Legend" container="legendDiv" />
                    <Widget id="scaleBarWidget" type="esri/widgets/ScaleBar" position="bottom-left" />
                    {/* TODO: container doesn't work for this widget, unless it's expandable. */}
                    <ExpandableWidget id="featureTableWidget" type="esri/widgets/FeatureTable" container="featureTableDiv" layer="grpLayer" />
                    <ExpandableHTML position="top-left">
                        <div style={{ backgroundColor: 'white', padding: '20px', width: '200px', height: '200px' }}>
                            Hello from ExpandableHTML!
                        </div>
                    </ExpandableHTML>
                    <HTML position="top-left">
                        <div style={{ backgroundColor: 'white', padding: '20px', width: '200px', height: '200px' }}>
                            Hello from HTML!
                        </div>
                    </HTML>
                    <HTML position="top-left">
                        {testHtml}
                    </HTML>


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

interface CounterWithIncrementState {
    feature: any;
    value: number;
}
class CounterWithIncrement extends React.Component<{}, CounterWithIncrementState> {
    public constructor(props: {}) {
        super(props);

        this.state = {
            feature: null,
            value: 0
        };
    }

    public async componentDidMount() {
        const layer = await mapSpy.getLayer<__esri.FeatureLayer>('testMap', 'keptLayer');
        if (layer && layer.type === 'feature') {
            await layer.when();
            const query = layer.createQuery();
            query.where = "1=1";
            query.outFields = ["*"];
            query.num = 1;

            const features = await layer.queryFeatures(query);
            this.setState({ feature: features.features[0].attributes });
        }
    }

    private onIncrement() {
        this.setState({ value: this.state.value + 1 });
    }

    public render () {
        return (
            <div>
                <p>Current value: {this.state.value}</p>
                <button onClick={this.onIncrement.bind(this)}>Increment</button>
                <pre><code>
                    {this.state.feature ? JSON.stringify(this.state.feature, null, 2) : 'Querying...'}
                </code></pre>
            </div>
        );
    }
}