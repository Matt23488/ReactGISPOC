import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WebMap, Map } from '@esri/react-arcgis';
import { loadTypedModules, fetchToken, EsriTypeMap } from './utilities/GIS';
import settings from './appsettings';

import './KYTCMap.css';
import { TokenContext } from './TokenContext';

interface KYTCMapProps {
    id: string;
}

function FeatureLayer(props: { map?: __esri.WebMap, view?: __esri.MapView, url: string }) {
    const [layer, setLayer] = React.useState<__esri.FeatureLayer | null>(null);

    React.useEffect(() => {
        (async function () {
            const [ FeatureLayerConstructor ] = await loadTypedModules('esri/layers/FeatureLayer');
            console.log('feature layer');

            const layer = new FeatureLayerConstructor({ url: props.url });
            setLayer(layer);
            props.map?.add(layer);
        })();

        return function cleanup() {
            console.log('feature layer cleanup');
            if (layer) props.map?.remove(layer);
        };
    }, []);

    return null;
}

type MemberType<T, U extends keyof T> = T[U];
type ValidPositions = MemberType<__esri.UIAddPosition, 'position'>;

type WidgetContructorModule<T extends keyof EsriTypeMap> = EsriTypeMap[T] extends { new(...params: never[]): __esri.Widget } ? T : never;
type WidgetConstructorFilter = { [T in keyof EsriTypeMap]: WidgetContructorModule<T> };
type WidgetContructorModules = WidgetConstructorFilter[keyof EsriTypeMap];

type FirstParameter<T> = T extends { new(options: infer U, ...params: never[]): any } ? U : never;
type ConstructorReturnType<T> = T extends { new(...params: never[]): infer U } ? U : never;
type ExtendsWidgetProps<T> = T extends __esri.WidgetProperties ? T : never;
type WidgetProperties = { [T in WidgetContructorModules ] : ExtendsWidgetProps<FirstParameter<EsriTypeMap[T]>> };

interface ExpandProps {
    expandIconClass?: string,
    expandToolTip?: string
}

function ExpandableWidget<T extends WidgetContructorModules>(props: { widget: T, widgetProps?: WidgetProperties[T], position?: ValidPositions, view?: __esri.MapView } & ExpandProps) {
    React.useEffect(() => {
        let expand: __esri.Expand | undefined;
        (async function () {
            const [Expand, constructor] = await loadTypedModules('esri/widgets/Expand', props.widget);
            console.log(`${props.widget} expand`);

            const widgetProps = { view: props.view, ...props.widgetProps };
            console.log(widgetProps);

            // const widget = new constructor({ view: props.view, ...props.widgetProps });
            const widget = new constructor(widgetProps);
            expand = new Expand({
                expandIconClass: props.expandIconClass,
                view: props.view,
                content: widget,
                expandTooltip: props.expandToolTip
            });
            props.view?.ui.add(expand, { position: props.position });
        })();

        return function cleanup() {
            if (expand) props.view?.ui.remove(expand);
        }
    });

    return null;
}

function ExpandableHTML(props: { content: JSX.Element, view?: __esri.MapView, position?: ValidPositions } & ExpandProps) {
    let expand: __esri.Expand | undefined;
    React.useEffect(() => {
        (async function () {
            const [ Expand ] = await loadTypedModules('esri/widgets/Expand');

            expand = new Expand({
                expandIconClass: props.expandIconClass,
                view: props.view,
                content: renderToStaticMarkup(props.content),
                expandTooltip: props.expandToolTip
            });
            props.view?.ui.add(expand, { position: props.position });
        })();

        return function cleanup() {
            if (expand) props.view?.ui.remove(expand);
        }
    }, []);

    return null;
}

function MapWidget<T extends WidgetContructorModules>(props: { widget: T, widgetProps?: WidgetProperties[T], init?: (widget: ConstructorReturnType<EsriTypeMap[T]>) => void, view?: __esri.MapView, position?: ValidPositions }) {
    React.useEffect(() => {
        let widget: __esri.Widget | undefined;
        (async function () {
            const [ constructor ] = await loadTypedModules(props.widget);

            const widgetProps = { view: props.view, ...props.widgetProps };
            widget = new constructor(widgetProps);
            if (props.init) props.init(widget as ConstructorReturnType<EsriTypeMap[T]>);
            props.view?.ui.add(widget, { position: props.position });
        })();

        return function cleanup() {
            if (widget) props.view?.ui.remove(widget);
        }
    }, []);

    return null;
}

// interface WidgetQueueItem {

// }
// let widgetQueue;

export default function KYTCMap(props: KYTCMapProps) {
    // const [data, setData] = React.useState<JSX.Element>(<p>Fetching ArcGIS token...</p>);
    // React.useEffect(() => {
    //     (async function () {
    //         // const [ esriId, esriConfig ] = await loadTypedModules('esri/identity/IdentityManager', 'esri/config');
    //         // console.log('KYTCMap');

    //         // esriConfig.portalUrl = settings.portalURL;

    //         // const token = await fetchToken();

    //         // esriId.registerToken({
    //         //     server: 'https://www.arcgis.com/sharing/rest',
    //         //     token: token.access_token
    //         // });

    //         const data = (
        console.log('KYTCMap init');
            return (
                <TokenContext portalUrl={settings.portalURL}>
                    <p></p>
                    <WebMap id={props.id} className='kytc-map'>
                        <FeatureLayer key={'ahpLayer'} url={settings.projectLayerURL} />
                        <ExpandableWidget key={'basemapGalleryWidget'} position={'top-right'} widget={'esri/widgets/BasemapGallery'} />
                        <ExpandableWidget key={'layerListWidget'} position={'top-right'} widget={'esri/widgets/LayerList'} />
                        <ExpandableWidget key={'printWidget'} position={'top-right'} widget={'esri/widgets/Print'} widgetProps={{ printServiceUrl: settings.printServiceURL }} />
                        <ExpandableHTML key={'kmlWidget'} position={'top-right'} content={
                            <div style={{ backgroundColor: 'white', padding: '10px' }}>What's up!</div>
                        } />
                        <MapWidget key={'homeWidget'} position={'top-left'} widget={'esri/widgets/Home'} init={widget => {
                            console.log('Home init');
                            // widget.on('go', e => {
                            //     alert(widget.viewModel.state);
                            // });
                        }} />
                        <MapWidget key={'fullscreenWidget'} position={'top-left'} widget={'esri/widgets/Fullscreen'} init={widget => {
                            console.log('Fullscreen init');
                            // widget.on('click', e => {
                            //     alert(widget.viewModel.state);
                            // });
                            // widget.view.on('resize', e => {
                            //     setData(data);
                            // });
                        }} />
                    </WebMap>
                </TokenContext>
            );

    //         setData(data);
    //     })();
    // }, []);

    // return data;
}