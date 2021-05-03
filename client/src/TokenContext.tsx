import React from 'react';
// import { useEffectAsync } from './utilities/ReactUtils';
import { loadTypedModules } from './utilities/GIS';

interface TokenContextProperties {
    portalUrl: string;
    children: JSX.Element;
    tokenFetchers: (() => Promise<{ server: string, token: string }>)[]
}

interface TokenContextState {
    tokenRegistered: boolean;
}

// TODO: Create a general context that takes in anything that can be configured in the API. Tokens, cors servers, portal URL, etc. Everything.
// Still playing with the idea. It might work out after all.
export class TokenContext extends React.Component<TokenContextProperties, TokenContextState> {
    public constructor(props: TokenContextProperties) {
        super(props);

        this.state = {
            tokenRegistered: false
        };
    }

    public async componentDidMount() {
        console.log('TokenContext init');
        const [esriId, esriConfig] = await loadTypedModules('esri/identity/IdentityManager', 'esri/config');

        esriConfig.portalUrl = this.props.portalUrl;

        const tokens = await Promise.all(this.props.tokenFetchers.map(f => f()));
        tokens.forEach(t => esriId.registerToken(t));

        console.log('Token(s) registered');
        this.setState({ tokenRegistered: true });
    }

    public componentDidUpdate() {
        console.log('TokenContext update');
    }

    public render() {
        console.log('TokenContext render');
        return this.state.tokenRegistered ? this.props.children : <LoadingIndicator text="Fetching ArcGIS token..." />;
    }
}

function LoadingIndicator(props: { text?: string }) {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '24px' }}>
                {props.text || 'Loading...'}
            </span>
        </div>
    );
}