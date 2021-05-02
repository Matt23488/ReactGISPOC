// import React from 'react';
import logo from './logo.svg';
import './App.css';
import { setDefaultOptions } from 'esri-loader';
import { KYTCMap } from './KYTCMap';
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
  // const [data, setData] = React.useState<string | null>(null);

  // React.useEffect(() => {
  //   (async function () {
  //     const res = await fetch('api');
  //     const data = await res.json() as { message: string };
  //     setData(data.message);
  //   })();
  // }, []);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        {/* <p>{data || 'Loading...'}</p> */}
        <KYTCMap id={'22813abda6cd4058b4c4d0f593671737'} portalUrl={settings.portalURL} tokenFetchers={[ getAGOLToken ]} />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
