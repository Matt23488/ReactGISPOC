// import React from 'react';
import { WebMap } from '@esri/react-arcgis';
// import { loadTypedModules } from './utilities/GIS';
import { Widget, ExpandableWidget, ExpandableHTML } from './Widget';
import { Layer } from './Layer';
import settings from './appsettings';

import './KYTCMap.css';
import { TokenContext } from './TokenContext';
import { fetchToken } from './utilities/GIS';

interface KYTCMapProps {
    id: string;
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

export default function KYTCMap(props: KYTCMapProps) {
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