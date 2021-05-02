import React from 'react';
import { WebMap } from '@esri/react-arcgis';
// import { loadTypedModules } from './utilities/GIS';
import { Widget, ExpandableWidget, ExpandableHTML } from './Widget';
import { Layer } from './Layer';
import settings from './appsettings';

import './KYTCMap.css';
import { TokenContext } from './TokenContext';
import { fetchToken, loadTypedModules } from './utilities/GIS';

interface KYTCMapProps {
    id: string;
    portalUrl: string;
    tokenFetchers: (() => Promise<{ server: string, token: string }>)[];
}

// function FeatureLayer(props: { map?: __esri.WebMap, view?: __esri.MapView, url: string }) {
//     React.useEffect(() => {
//         let layer: __esri.FeatureLayer | undefined;
//         (async function () {
//             const [ FeatureLayerConstructor ] = await loadTypedModules('esri/layers/FeatureLayer');
//             console.log('feature layer');

//             layer = new FeatureLayerConstructor({ url: props.url });
//             props.map?.add(layer);
//         })();

//         return function cleanup() {
//             console.log('feature layer cleanup');
//             if (layer) props.map?.remove(layer);
//         };
//     });

//     return null;
// }
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
            <WebMap id={props.id} className='kytc-map'>
                {/* <FeatureLayer url={settings.projectLayerURL} /> */}
                <Layer type="esri/layers/FeatureLayer" url={settings.projectLayerURL} />
                <ExpandableWidget position="top-right" type="esri/widgets/BasemapGallery" />
                <ExpandableWidget position="top-right" type="esri/widgets/LayerList" />
                <ExpandableWidget position="top-right" type="esri/widgets/Print" widgetProperties={{ printServiceUrl: settings.printServiceURL }} />
                <ExpandableHTML position="top-right" content={
                    <div style={{ backgroundColor: 'white', padding: '10px' }}>What's up!</div>
                } />
                <Widget position="top-left" type="esri/widgets/Home" init={widget => {
                    console.log('Home init');
                }} />
                <Widget position="top-left" type="esri/widgets/Fullscreen" init={widget => {
                    console.log('Fullscreen init');
                }} />
                <Widget position="bottom-right" type="esri/widgets/Legend" />
            </WebMap>
        </TokenContext>
    );
}

// export function KYTCMapOLD(props: KYTCMapProps) {
//     // const [content, setContent] = React.useState(<p>Loading...</p>);
//     const [tokenRegistered, setTokenRegistered] = React.useState(false);

//     React.useEffect(() => {
//         (async function () {
//             const [ esriId, esriConfig ] = await loadTypedModules('esri/identity/IdentityManager', 'esri/config');

//             esriConfig.portalUrl = props.portalUrl;

//             const tokens = await Promise.all(props.tokenFetchers.map(f => f()));
//             tokens.forEach(t => esriId.registerToken(t));

//             console.log('Token(s) registered');
//             setTokenRegistered(true);
//         })();
//     });

//     const map = (
//         <WebMap id={props.id} className='kytc-map'>
//             {/* <FeatureLayer url={settings.projectLayerURL} /> */}
//             <Layer type="esri/layers/FeatureLayer" url={settings.projectLayerURL} />
//             <ExpandableWidget position="top-right" type="esri/widgets/BasemapGallery" />
//             <ExpandableWidget position="top-right" type="esri/widgets/LayerList" />
//             <ExpandableWidget position="top-right" type="esri/widgets/Print" widgetProperties={{ printServiceUrl: settings.printServiceURL }} />
//             <ExpandableHTML position="top-right" content={
//                 <div style={{ backgroundColor: 'white', padding: '10px' }}>What's up!</div>
//             } />
//             <Widget position="top-left" type="esri/widgets/Home" init={widget => {
//                 console.log('Home init');
//             }} />
//             <Widget position="top-left" type="esri/widgets/Fullscreen" init={widget => {
//                 console.log('Fullscreen init');
//             }} />
//             <Widget position="bottom-right" type="esri/widgets/Legend" />
//         </WebMap>
//     );

//     return tokenRegistered ? map : <p>Loading...</p>;
// }

interface KYTCMapState {
    tokenRegistered: boolean;
}
export class KYTCMap extends React.Component<KYTCMapProps, KYTCMapState> {

    public constructor(props: KYTCMapProps) {
        super(props);

        this.state = {
            tokenRegistered: false
        };
    }

    public async componentDidMount() {
        console.log('KYTCMap componentDidMount');
        const [ esriId, esriConfig ] = await loadTypedModules('esri/identity/IdentityManager', 'esri/config');

        esriConfig.portalUrl = this.props.portalUrl;

        const tokens = await Promise.all(this.props.tokenFetchers.map(f => f()));
        tokens.forEach(t => esriId.registerToken(t));

        console.log('Token(s) registered');
        this.setState({ tokenRegistered: true });
    }

    public render() {
        console.log('KYTCMap render');
        const map = (
            <WebMap id={this.props.id} className='kytc-map'>
                {/* <FeatureLayer url={settings.projectLayerURL} /> */}
                <Layer type="esri/layers/FeatureLayer" url={settings.projectLayerURL} />
                <ExpandableWidget position="top-right" type="esri/widgets/BasemapGallery" />
                <ExpandableWidget position="top-right" type="esri/widgets/LayerList" />
                <ExpandableWidget position="top-right" type="esri/widgets/Print" widgetProperties={{ printServiceUrl: settings.printServiceURL }} />
                <ExpandableHTML position="top-right" content={
                    <div style={{ backgroundColor: 'white', padding: '10px' }}>What's up!</div>
                } />
                <Widget position="top-left" type="esri/widgets/Home" init={widget => {
                    console.log('Home init');
                }} />
                <Widget position="top-left" type="esri/widgets/Fullscreen" init={widget => {
                    console.log('Fullscreen init');
                }} />
                <Widget position="bottom-right" type="esri/widgets/Legend" />
                <Widget position="bottom-left" type="esri/widgets/ScaleBar" />
            </WebMap>
        );
    
        return this.state.tokenRegistered ? map : <p>Loading...</p>;
    }
}