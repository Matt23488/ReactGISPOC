import React from 'react';
import { useEffectAsync } from './utilities/ReactUtils';
import { fetchToken, loadTypedModules } from './utilities/GIS';

interface TokenContextProperties {
    portalUrl: string;
    children: any;
}

// TODO: Create a general context that takes in anything that can be configured in the API. Tokens, cors servers, portal URL, etc. Everything.
export function TokenContext(props: TokenContextProperties) {
    console.log('TokenContext init');
    const [data, setData] = React.useState<JSX.Element>(<p>Fetching ArcGIS token...</p>);
    useEffectAsync(async () => {
        const [ esriId, esriConfig ] = await loadTypedModules('esri/identity/IdentityManager', 'esri/config');

        esriConfig.portalUrl = props.portalUrl;

        const token = await fetchToken();

        esriId.registerToken({
            server: 'https://www.arcgis.com/sharing/rest',
            token: token.access_token
        });

        console.log('Token registered');
        setData(props.children);
    });

    return data;
}