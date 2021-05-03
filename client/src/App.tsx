// import React from 'react';
// import logo from './logo.svg';
import './App.css';
import { setDefaultOptions } from 'esri-loader';
import { KYTCMapWithTokenContext } from './KYTCMap';
import settings from './appsettings';
import { fetchToken } from './utilities/GIS';

setDefaultOptions({ css: true });

async function getAGOLToken() {
    const token = await fetchToken();
    return {
        server: 'https://www.arcgis.com/sharing/rest',
        token: token.access_token
    };
}

function App() {
    return (
        <div className="App">
            <KYTCMapWithTokenContext id={'22813abda6cd4058b4c4d0f593671737'} portalUrl={settings.portalURL} tokenFetchers={[ getAGOLToken ]} />
        </div>
    );
}

export default App;
