import React from 'react';
import { useEffectAsync } from './utilities/ReactUtils';
import { loadTypedModules } from './utilities/GIS';

interface TokenContextProperties {
    portalUrl: string;
    children: any;
    tokenFetchers: (() => Promise<{ server: string, token: string }>)[]
}

// TODO: Create a general context that takes in anything that can be configured in the API. Tokens, cors servers, portal URL, etc. Everything.
// I will explore this idea but I'm still not sold on a wrapper component. But to do so I will need to make
// it a class component because React.useEffect is called on mount and update, when mount is the only time
// we want to fetch the token, etc.
export function TokenContext(props: TokenContextProperties) {
    console.log('TokenContext init');
    const [data, setData] = React.useState<JSX.Element>(<p>Fetching ArcGIS token...</p>);
    useEffectAsync(async () => {
        const [ esriId, esriConfig ] = await loadTypedModules('esri/identity/IdentityManager', 'esri/config');

        esriConfig.portalUrl = props.portalUrl;

        const tokens = await Promise.all(props.tokenFetchers.map(f => f()));
        tokens.forEach(t => esriId.registerToken(t));

        console.log('Token(s) registered');
        setData(props.children);
    });

    return data;
}