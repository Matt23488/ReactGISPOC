import React from 'react';
// import logo from './logo.svg';
import './App.css';
import { setDefaultOptions } from 'esri-loader';
import { KYTCMapWithTokenContext } from './KYTCMap';
import settings from './appsettings';
import { fetchToken, getLayer } from './utilities/GIS';

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
            <div style={{ boxSizing: 'border-box', padding: '10px', float: 'left', width: '300px', height: '100%' }}>
                <p>Lorem ipsum dolor set amet</p>
                <CounterWithIncrement />
            </div>
            <div style={{ float: 'left', width: 'calc(100% - 300px)', height: '100%' }}>
                <KYTCMapWithTokenContext id="22813abda6cd4058b4c4d0f593671737" lookupId="testMap" portalUrl={settings.portalURL} tokenFetchers={[ getAGOLToken ]} />
            </div>
        </div>
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
        const layer = await getLayer<__esri.FeatureLayer>('testMap', 'keptLayer');
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
                    {JSON.stringify(this.state.feature, undefined, '  ')}
                </code></pre>
            </div>
        );
    }
}