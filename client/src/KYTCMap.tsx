import React from 'react';
import { WebMap } from '@esri/react-arcgis';
// import { loadTypedModules } from './utilities/GIS';
import { Widget, ExpandableWidget, ExpandableHTML, Sketch } from './Widget';
import { FeatureLayer, GraphicsLayer } from './Layers';
import settings from './appsettings';

import './KYTCMap.css';
import { TokenContext } from './TokenContext';
import { fetchToken } from './utilities/GIS';

interface KYTCMapProps {
    id: string;
    portalUrl: string;
    tokenFetchers: (() => Promise<{ server: string, token: string }>)[];
}

async function getAHPToken() {
    const token = await fetchToken();
    return {
        server: 'https://www.arcgis.com/sharing/rest',
        token: token.access_token
    };
}

export function KYTCMapWithTokenContext(props: KYTCMapProps) {
    console.log('KYTCMap init');
    return (
        <TokenContext portalUrl={settings.portalURL} tokenFetchers={[ getAHPToken ]}>
            <WebMap id={props.id} className="KYTCMap">
                <Sketch position="top-right" layer="testGraphicsLayer" id="testSketch" />
                <FeatureLayer url={settings.projectLayerURL} id="ahpLayer" title="Active Highway Plan" />
                {/* <Editor position="top-right" layer="ahpLayer" /> */}
                <ExpandableWidget id="basemapGallery" position="top-right" type="esri/widgets/BasemapGallery" expandProperties={{ expandTooltip: "Open Basemap Gallery", collapseTooltip: "Close Basemap Gallery" }} />
                <ExpandableWidget id="layerList" position="top-right" type="esri/widgets/LayerList" expandProperties={{ expandTooltip: "Open Layer List", collapseTooltip: "Close Layer List" }} />
                <ExpandableWidget id="print" position="top-right" type="esri/widgets/Print" widgetProperties={{ printServiceUrl: settings.printServiceURL }} expandProperties={{ expandTooltip: "Open PDF Export", collapseTooltip: "Close PDF Export" }} />
                {/* <ExpandableHTML position="top-right" expandProperties={{ expandTooltip: "Open HTML", collapseTooltip: "Close HTML" }} content={
                    <div style={{ backgroundColor: 'white', padding: '10px' }}>What's up!</div>
                } /> */}
                <ExpandableHTML position="top-right" expandProperties={{ expandTooltip: 'Open HTML', collapseTooltip: 'Close HTML' }} content={'<div style="background-color: white; padding: 10px;">What\'s up!</div>'} />
                <Widget id="home" position="top-left" type="esri/widgets/Home" />
                <Widget id="fullscreen" position="top-left" type="esri/widgets/Fullscreen" />
                <Widget id="legend" position="bottom-right" type="esri/widgets/Legend" />
                <Widget id="scaleBar" position="bottom-left" type="esri/widgets/ScaleBar" />

                <GraphicsLayer id="testGraphicsLayer" title="Test Graphics Layer" />
            </WebMap>
        </TokenContext>
    );
}

// interface KYTCMapState {
//     tokenRegistered: boolean;
// }
// export class KYTCMap extends React.Component<KYTCMapProps, KYTCMapState> {

//     public constructor(props: KYTCMapProps) {
//         super(props);

//         this.state = {
//             tokenRegistered: false
//         };
//     }

//     public async componentDidMount() {
//         console.log('KYTCMap componentDidMount');
//         const [ esriId, esriConfig ] = await loadTypedModules('esri/identity/IdentityManager', 'esri/config');

//         esriConfig.portalUrl = this.props.portalUrl;

//         const tokens = await Promise.all(this.props.tokenFetchers.map(f => f()));
//         tokens.forEach(t => esriId.registerToken(t));

//         console.log('Token(s) registered');
//         this.setState({ tokenRegistered: true });
//     }

//     public render() {
//         console.log('KYTCMap render');
//         const map = (
//             <WebMap id={this.props.id} className='kytc-map'>
//                 <FeatureLayer url={settings.projectLayerURL} />
//                 {/* <Layer type="esri/layers/FeatureLayer" url={settings.projectLayerURL} /> */}
//                 <ExpandableWidget position="top-right" type="esri/widgets/BasemapGallery" />
//                 <ExpandableWidget position="top-right" type="esri/widgets/LayerList" />
//                 <ExpandableWidget position="top-right" type="esri/widgets/Print" widgetProperties={{ printServiceUrl: settings.printServiceURL }} />
//                 <ExpandableHTML position="top-right" content={
//                     <div style={{ backgroundColor: 'white', padding: '10px' }}>What's up!</div>
//                 } />
//                 <Widget position="top-left" type="esri/widgets/Home" init={widget => {
//                     console.log('Home init');
//                 }} />
//                 <Widget position="top-left" type="esri/widgets/Fullscreen" init={widget => {
//                     console.log('Fullscreen init');
//                 }} />
//                 <Widget position="bottom-right" type="esri/widgets/Legend" />
//                 <Widget position="bottom-left" type="esri/widgets/ScaleBar" />
//             </WebMap>
//         );
    
//         return this.state.tokenRegistered ? map : <p>Loading...</p>;
//     }
// }