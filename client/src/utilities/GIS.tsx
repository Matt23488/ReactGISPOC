import { loadModules } from 'esri-loader';
// import React from 'react';
import settings from '../appsettings';

export async function fetchToken() {
    if (process.env.NODE_ENV === 'development') {
        const options = {
            client_id: settings.oAuth.clientID,
            client_secret: settings.oAuth.clientSecret,
            grant_type: 'client_credentials',
            expiration: '20160',
            f: 'json'
        } as { [key: string]: string };
        const params = [];
        for (let key in options) {
            params.push(`${encodeURIComponent(key)}=${encodeURIComponent(options[key])}`)
        }
    
        const tokenRes = await fetch(settings.oAuth.tokenURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.join('&')
        });
    
        const tokenData = await tokenRes.json();
        return tokenData as { access_token: string, expires_in: number };
    } else {
        const res = await fetch('api/token');
        const data = await res.json() as { access_token: string, expires_in: number };
        return data;
    }
}

// export function getLayer<T extends __esri.Layer>(view: __esri.View, layer: string, timeout = 10000) {
//     return new Promise<T | undefined>(resolve => {
//         window.setTimeout(resolve, timeout);
//         view.on('layerview-create', e => {
//             if (e.layer.id === layer) resolve(e.layer as T);
//         });
//     });
// }
// TODO: I think what I'm going to do is convert the TokenContext component into a MapContext component.
// It will be the same, except it will maintain map and view as state properties. Or, I will look into how to do that
// so that it can call updates on child components when things like maps and layers have finished loading
export function getLayer<T extends __esri.Layer>(map: __esri.Map, layer: string, timeout = 10000) {
    return new Promise<T | undefined>(resolve => {
        window.setTimeout(resolve, timeout);
        map.layers.on('')
        map.layers.forEach(l => {
            console.log('layer id', l.id);
            if (l.id !== layer) return;

            l.when(() => resolve(l as T));
        });
    });
}

export function getLayers(view: __esri.View, timeout = 10000) {
    return new Promise<__esri.Layer[] | undefined>(resolve => {
        window.setTimeout(resolve, timeout);
        view.when(async () => {
            const layers = view.map.layers.toArray();
            await Promise.all(layers.map(l => l.when()));
            resolve(layers);
        });
    });
}

const _mapMap = new Map<string, __esri.Map>();
export function registerMap(lookupId: string, map: __esri.Map) {
    _mapMap.set(lookupId, map);
}

export function getMap(lookupId: string) {
    return _mapMap.get(lookupId);
}

// export function getWidget<T extends __esri.Widget>(view: __esri.View, widget: string) {
//     return new Promise<T | undefined>(resolve => {
//         const result = view.ui.find(widget);
//         if (result instanceof HTMLElement) resolve(undefined);
//         else resolve(result as T);
//     });
// }

// interface WidgetContextData {
//     widgetPromises: { widgetId: string, promise: Promise<__esri.Widget> }[];
//     resolves: { widgetId: string, resolve: (widget: __esri.Widget) => void }[];
// }

// // TODO: This isn't working. Circular dependencies are a problem and cause a deadlock.
// // I might be able to ensure that the widget instances are registered, rather than promises to them.
// // My current idea is that it MUST happen before it requests dependencies. But that won't work either. Idk
// // I'll solve it tomorrow.
// const _widgetMap = new Map<__esri.View, WidgetContextData>();
// export const MapContext = {
//     registerWidget: (view: __esri.View, widgetId: string, widgetPromise: Promise<__esri.Widget>) => {
//         let contextData: WidgetContextData;
//         if (_widgetMap.has(view)) contextData = _widgetMap.get(view)!;
//         else {
//             contextData = { widgetPromises: [], resolves: [] };
//             _widgetMap.set(view, contextData);
//         }

//         contextData.resolves.filter(r => r.widgetId === widgetId).forEach(r => widgetPromise.then(w => r.resolve(w)));
//         contextData.widgetPromises.push({ widgetId, promise: widgetPromise });
//     },

//     getWidget: <T extends __esri.Widget>(view: __esri.View, widgetId: string, timeout = 10000) => {
//         return new Promise<T>(resolve => {
//             let contextData: WidgetContextData;
//             if (_widgetMap.has(view)) contextData = _widgetMap.get(view)!;
//             else {
//                 contextData = { widgetPromises: [], resolves: [] };
//             }

//             const widget = contextData.widgetPromises.find(w => w.widgetId === widgetId);
//             if (widget) widget.promise.then(w => resolve(w as T));
//             // else window.setTimeout(resolve, timeout);
            
//             window.setTimeout(resolve, timeout);
//         });
//     }
// };
// export const WidgetContext = React.createContext(contextObj);

// export function WidgetContextProvider(props: { children: JSX.Element }) {
//     return <WidgetContext.Provider value={contextObj}>{props.children}</WidgetContext.Provider>;
// }

/**
 * Wrapper for `loadModules()` in [esri-loader](https://npmjs.com/package/esri-loader). The purpose is to provide a better
 * function signature to allow TypeScript to infer the correct types of the
 * returned esri modules, so that intellisense works with the module definitions
 * in [@types/arcgis-js-api](https://npmjs.com/package/@types/arcgis-js-api)
 * @param modules The requested esri modules
 * @returns A Promise that resolves to an array of esri modules in the order they were requested in the `modules` paramter
 */
 export function loadTypedModules<T extends Array<keyof EsriTypeMap>>(...modules: T): Promise<{
    [K in keyof T]: T[K] extends keyof EsriTypeMap ? EsriTypeMap[T[K]] : never
}> {
    return loadModules(modules);
}

/**
 * Maps module paths to the actual types returned from the API.
 * Used in `loadTypedModules()` to leverate TypeScript Type Inferrence.
 */
export interface EsriTypeMap {
    'esri/Color': typeof import('esri/Color');
    'esri/portal/Portal': typeof import('esri/portal/Portal');
    'esri/portal/PortalGroup': typeof import('esri/portal/PortalGroup');
    'esri/portal/PortalItem': typeof import('esri/portal/PortalItem');
    'esri/portal/PortalUser': typeof import('esri/portal/PortalUser');
    'esri/widgets/support/widget': typeof import('esri/widgets/support/widget');
    'esri/core/Accessor': typeof import('esri/core/Accessor');
    'esri/tasks/support/ClosestFacilityParameters': typeof import('esri/tasks/support/ClosestFacilityParameters');
    'esri/tasks/support/RouteParameters': typeof import('esri/tasks/support/RouteParameters');
    'esri/tasks/support/ServiceAreaParameters': typeof import('esri/tasks/support/ServiceAreaParameters');
    'esri/support/actions/ActionBase': typeof import('esri/support/actions/ActionBase');
    'esri/support/actions/ActionButton': typeof import('esri/support/actions/ActionButton');
    'esri/PopupTemplate': typeof import('esri/PopupTemplate');
    'esri/widgets/Popup': typeof import('esri/widgets/Popup');
    'esri/widgets/Popup/PopupViewModel': typeof import('esri/widgets/Popup/PopupViewModel');
    'esri/widgets/LayerList/ListItem': typeof import('esri/widgets/LayerList/ListItem');
    'esri/widgets/TableList/ListItem': typeof import('esri/widgets/TableList/ListItem');
    'esri/support/actions/ActionToggle': typeof import('esri/support/actions/ActionToggle');
    'esri/views/draw/Draw': typeof import('esri/views/draw/Draw');
    'esri/widgets/Attachments/AttachmentsViewModel': typeof import('esri/widgets/Attachments/AttachmentsViewModel');
    'esri/widgets/BasemapGallery': typeof import('esri/widgets/BasemapGallery');
    'esri/widgets/BasemapToggle': typeof import('esri/widgets/BasemapToggle');
    'esri/widgets/BasemapGallery/BasemapGalleryViewModel': typeof import('esri/widgets/BasemapGallery/BasemapGalleryViewModel');
    'esri/widgets/BasemapToggle/BasemapToggleViewModel': typeof import('esri/widgets/BasemapToggle/BasemapToggleViewModel');
    'esri/widgets/Bookmarks/BookmarksViewModel': typeof import('esri/widgets/Bookmarks/BookmarksViewModel');
    'esri/layers/BuildingSceneLayer': typeof import('esri/layers/BuildingSceneLayer');
    'esri/layers/WMTSLayer': typeof import('esri/layers/WMTSLayer');
    'esri/widgets/Legend/support/ActiveLayerInfo': typeof import('esri/widgets/Legend/support/ActiveLayerInfo');
    'esri/widgets/Legend': typeof import('esri/widgets/Legend');
    'esri/widgets/Legend/LegendViewModel': typeof import('esri/widgets/Legend/LegendViewModel');
    'esri/widgets/Search': typeof import('esri/widgets/Search');
    'esri/widgets/Search/SearchViewModel': typeof import('esri/widgets/Search/SearchViewModel');
    'esri/widgets/Measurement': typeof import('esri/widgets/Measurement');
    'esri/widgets/Sketch': typeof import('esri/widgets/Sketch');
    'esri/widgets/Measurement/MeasurementViewModel': typeof import('esri/widgets/Measurement/MeasurementViewModel');
    'esri/widgets/Sketch/SketchViewModel': typeof import('esri/widgets/Sketch/SketchViewModel');
    'esri/widgets/Editor': typeof import('esri/widgets/Editor');
    'esri/widgets/Editor/EditorViewModel': typeof import('esri/widgets/Editor/EditorViewModel');
    'esri/Map': typeof import('esri/Map');
    'esri/WebMap': typeof import('esri/WebMap');
    'esri/WebScene': typeof import('esri/WebScene');
    'esri/core/Collection': typeof import('esri/core/Collection');
    'esri/core/Handles': typeof import('esri/core/Handles');
    'esri/layers/GraphicsLayer': typeof import('esri/layers/GraphicsLayer');
    'esri/layers/GroupLayer': typeof import('esri/layers/GroupLayer');
    'esri/views/3d/externalRenderers': typeof import('esri/views/3d/externalRenderers');
    'esri/views/ui/DefaultUI': typeof import('esri/views/ui/DefaultUI');
    'esri/views/ui/UI': typeof import('esri/views/ui/UI');
    'esri/layers/FeatureLayer': typeof import('esri/layers/FeatureLayer');
    'esri/renderers/ClassBreaksRenderer': typeof import('esri/renderers/ClassBreaksRenderer');
    'esri/geometry/Mesh': typeof import('esri/geometry/Mesh');
    'esri/layers/support/PixelBlock': typeof import('esri/layers/support/PixelBlock');
    'esri/core/scheduling': typeof import('esri/core/scheduling');
    'esri/geometry/Polyline': typeof import('esri/geometry/Polyline');
    'esri/geometry/Multipoint': typeof import('esri/geometry/Multipoint');
    'esri/core/urlUtils': typeof import('esri/core/urlUtils');
    'esri/layers/BaseDynamicLayer': typeof import('esri/layers/BaseDynamicLayer');
    'esri/layers/BaseElevationLayer': typeof import('esri/layers/BaseElevationLayer');
    'esri/layers/BaseTileLayer': typeof import('esri/layers/BaseTileLayer');
    'esri/layers/BingMapsLayer': typeof import('esri/layers/BingMapsLayer');
    'esri/tasks/support/AddressCandidate': typeof import('esri/tasks/support/AddressCandidate');
    'esri/tasks/Locator': typeof import('esri/tasks/Locator');
    'esri/webdoc/applicationProperties/Search': typeof import('esri/webdoc/applicationProperties/Search');
    'esri/geometry/Circle': typeof import('esri/geometry/Circle');
    'esri/geometry/Polygon': typeof import('esri/geometry/Polygon');
    'esri/renderers/UniqueValueRenderer': typeof import('esri/renderers/UniqueValueRenderer');
    'esri/identity/ServerInfo': typeof import('esri/identity/ServerInfo');
    'esri/config': typeof import('esri/config');
    'esri/smartMapping/statistics/support/ageUtils': typeof import('esri/smartMapping/statistics/support/ageUtils');
    'esri/smartMapping/renderers/color': typeof import('esri/smartMapping/renderers/color');
    'esri/smartMapping/renderers/size': typeof import('esri/smartMapping/renderers/size');
    'esri/tasks/support/Query': typeof import('esri/tasks/support/Query');
    'esri/tasks/support/AlgorithmicColorRamp': typeof import('esri/tasks/support/AlgorithmicColorRamp');
    'esri/layers/support/Field': typeof import('esri/layers/support/Field');
    'esri/widgets/FeatureTable/FieldColumn': typeof import('esri/widgets/FeatureTable/FieldColumn');
    'esri/core/accessorSupport/decorators': typeof import('esri/core/accessorSupport/decorators');
    'esri/smartMapping/symbology/support/colorRamps': typeof import('esri/smartMapping/symbology/support/colorRamps');
    'esri/views/MapView': typeof import('esri/views/MapView');
    'esri/views/SceneView': typeof import('esri/views/SceneView');
    'esri/views/View': typeof import('esri/views/View');
    'esri/widgets/Print': typeof import('esri/widgets/Print');
    'esri/widgets/Print/PrintViewModel': typeof import('esri/widgets/Print/PrintViewModel');
    'esri/widgets/BuildingExplorer/BuildingLevel': typeof import('esri/widgets/BuildingExplorer/BuildingLevel');
    'esri/widgets/BuildingExplorer/BuildingPhase': typeof import('esri/widgets/BuildingExplorer/BuildingPhase');
    'esri/layers/MapImageLayer': typeof import('esri/layers/MapImageLayer');
    'esri/layers/TileLayer': typeof import('esri/layers/TileLayer');
    'esri/layers/WMSLayer': typeof import('esri/layers/WMSLayer');
    'esri/geometry/support/MeshMaterial': typeof import('esri/geometry/support/MeshMaterial');
    'esri/geometry/support/MeshMaterialMetallicRoughness': typeof import('esri/geometry/support/MeshMaterialMetallicRoughness');
    'esri/renderers/RasterShadedReliefRenderer': typeof import('esri/renderers/RasterShadedReliefRenderer');
    'esri/popup/content/BarChartMediaInfo': typeof import('esri/popup/content/BarChartMediaInfo');
    'esri/popup/content/ColumnChartMediaInfo': typeof import('esri/popup/content/ColumnChartMediaInfo');
    'esri/popup/content/ImageMediaInfo': typeof import('esri/popup/content/ImageMediaInfo');
    'esri/popup/content/LineChartMediaInfo': typeof import('esri/popup/content/LineChartMediaInfo');
    'esri/popup/content/PieChartMediaInfo': typeof import('esri/popup/content/PieChartMediaInfo');
    'esri/symbols/IconSymbol3DLayer': typeof import('esri/symbols/IconSymbol3DLayer');
    'esri/symbols/ObjectSymbol3DLayer': typeof import('esri/symbols/ObjectSymbol3DLayer');
    'esri/symbols/PathSymbol3DLayer': typeof import('esri/symbols/PathSymbol3DLayer');
    'esri/symbols/MarkerSymbol': typeof import('esri/symbols/MarkerSymbol');
    'esri/symbols/PictureMarkerSymbol': typeof import('esri/symbols/PictureMarkerSymbol');
    'esri/symbols/SimpleMarkerSymbol': typeof import('esri/symbols/SimpleMarkerSymbol');
    'esri/symbols/TextSymbol': typeof import('esri/symbols/TextSymbol');
    'esri/identity/OAuthInfo': typeof import('esri/identity/OAuthInfo');
    'esri/webmap/ApplicationProperties': typeof import('esri/webmap/ApplicationProperties');
    'esri/webscene/ApplicationProperties': typeof import('esri/webscene/ApplicationProperties');
    'esri/symbols/support/cimSymbolUtils': typeof import('esri/symbols/support/cimSymbolUtils');
    'esri/layers/GeoJSONLayer': typeof import('esri/layers/GeoJSONLayer');
    'esri/layers/SceneLayer': typeof import('esri/layers/SceneLayer');
    'esri/webscene/Slide': typeof import('esri/webscene/Slide');
    'esri/geometry/geometryEngine': typeof import('esri/geometry/geometryEngine');
    'esri/widgets/AreaMeasurement2D': typeof import('esri/widgets/AreaMeasurement2D');
    'esri/widgets/AreaMeasurement2D/AreaMeasurement2DViewModel': typeof import('esri/widgets/AreaMeasurement2D/AreaMeasurement2DViewModel');
    'esri/widgets/AreaMeasurement3D': typeof import('esri/widgets/AreaMeasurement3D');
    'esri/widgets/AreaMeasurement3D/AreaMeasurement3DViewModel': typeof import('esri/widgets/AreaMeasurement3D/AreaMeasurement3DViewModel');
    'esri/tasks/GeometryService': typeof import('esri/tasks/GeometryService');
    'esri/tasks/support/AreasAndLengthsParameters': typeof import('esri/tasks/support/AreasAndLengthsParameters');
    'esri/layers/support/MosaicRule': typeof import('esri/layers/support/MosaicRule');
    'esri/webscene/Environment': typeof import('esri/webscene/Environment');
    'esri/views/2d/layers/BaseLayerView2D': typeof import('esri/views/2d/layers/BaseLayerView2D');
    'esri/views/2d/layers/BaseLayerViewGL2D': typeof import('esri/views/2d/layers/BaseLayerViewGL2D');
    'esri/layers/support/AttachmentInfo': typeof import('esri/layers/support/AttachmentInfo');
    'esri/tasks/support/AttachmentQuery': typeof import('esri/tasks/support/AttachmentQuery');
    'esri/widgets/Attachments': typeof import('esri/widgets/Attachments');
    'esri/popup/content': typeof import('esri/popup/content');
    'esri/popup/content/AttachmentsContent': typeof import('esri/popup/content/AttachmentsContent');
    'esri/widgets/FeatureTable': typeof import('esri/widgets/FeatureTable');
    'esri/widgets/FeatureTable/FeatureTableViewModel': typeof import('esri/widgets/FeatureTable/FeatureTableViewModel');
    'esri/renderers/support/AttributeColorInfo': typeof import('esri/renderers/support/AttributeColorInfo');
    'esri/renderers/VectorFieldRenderer': typeof import('esri/renderers/VectorFieldRenderer');
    'esri/Graphic': typeof import('esri/Graphic');
    'esri/renderers/DotDensityRenderer': typeof import('esri/renderers/DotDensityRenderer');
    'esri/layers/support/RasterInfo': typeof import('esri/layers/support/RasterInfo');
    'esri/widgets/Attribution': typeof import('esri/widgets/Attribution');
    'esri/layers/VectorTileLayer': typeof import('esri/layers/VectorTileLayer');
    'esri/widgets/Print/TemplateOptions': typeof import('esri/widgets/Print/TemplateOptions');
    'esri/widgets/Attribution/AttributionViewModel': typeof import('esri/widgets/Attribution/AttributionViewModel');
    'esri/tasks/support/PrintTemplate': typeof import('esri/tasks/support/PrintTemplate');
    'esri/renderers/DictionaryRenderer': typeof import('esri/renderers/DictionaryRenderer');
    'esri/renderers/HeatmapRenderer': typeof import('esri/renderers/HeatmapRenderer');
    'esri/renderers/Renderer': typeof import('esri/renderers/Renderer');
    'esri/renderers/support/AuthoringInfo': typeof import('esri/renderers/support/AuthoringInfo');
    'esri/renderers/support/AuthoringInfoVisualVariable': typeof import('esri/renderers/support/AuthoringInfoVisualVariable');
    'esri/widgets/FeatureTable/Grid/support/ButtonMenuItem': typeof import('esri/widgets/FeatureTable/Grid/support/ButtonMenuItem');
    'esri/widgets/Expand': typeof import('esri/widgets/Expand');
    'esri/widgets/Expand/ExpandViewModel': typeof import('esri/widgets/Expand/ExpandViewModel');
    'esri/widgets/Search/LayerSearchSource': typeof import('esri/widgets/Search/LayerSearchSource');
    'esri/widgets/Search/LocatorSearchSource': typeof import('esri/widgets/Search/LocatorSearchSource');
    'esri/widgets/Search/SearchSource': typeof import('esri/widgets/Search/SearchSource');
    'esri/views/layers/BuildingComponentSublayerView': typeof import('esri/views/layers/BuildingComponentSublayerView');
    'esri/views/layers/FeatureLayerView': typeof import('esri/views/layers/FeatureLayerView');
    'esri/views/layers/SceneLayerView': typeof import('esri/views/layers/SceneLayerView');
    'esri/widgets/Histogram': typeof import('esri/widgets/Histogram');
    'esri/widgets/HistogramRangeSlider': typeof import('esri/widgets/HistogramRangeSlider');
    'esri/widgets/Histogram/HistogramViewModel': typeof import('esri/widgets/Histogram/HistogramViewModel');
    'esri/widgets/HistogramRangeSlider/HistogramRangeSliderViewModel': typeof import('esri/widgets/HistogramRangeSlider/HistogramRangeSliderViewModel');
    'esri/renderers/visualVariables/RotationVariable': typeof import('esri/renderers/visualVariables/RotationVariable');
    'esri/renderers/visualVariables/SizeVariable': typeof import('esri/renderers/visualVariables/SizeVariable');
    'esri/webmap/InitialViewProperties': typeof import('esri/webmap/InitialViewProperties');
    'esri/webscene/background/Background': typeof import('esri/webscene/background/Background');
    'esri/layers/ImageryTileLayer': typeof import('esri/layers/ImageryTileLayer');
    'esri/layers/WCSLayer': typeof import('esri/layers/WCSLayer');
    'esri/widgets/BasemapLayerList': typeof import('esri/widgets/BasemapLayerList');
    'esri/widgets/BasemapLayerList/BasemapLayerListViewModel': typeof import('esri/widgets/BasemapLayerList/BasemapLayerListViewModel');
    'esri/Basemap': typeof import('esri/Basemap');
    'esri/views/BasemapView': typeof import('esri/views/BasemapView');
    'esri/widgets/BasemapGallery/support/BasemapGalleryItem': typeof import('esri/widgets/BasemapGallery/support/BasemapGalleryItem');
    'esri/widgets/BasemapGallery/support/PortalBasemapsSource': typeof import('esri/widgets/BasemapGallery/support/PortalBasemapsSource');
    'esri/widgets/BasemapGallery/support/LocalBasemapsSource': typeof import('esri/widgets/BasemapGallery/support/LocalBasemapsSource');
    'esri/tasks/support/OffsetParameters': typeof import('esri/tasks/support/OffsetParameters');
    'esri/layers/CSVLayer': typeof import('esri/layers/CSVLayer');
    'esri/layers/GeoRSSLayer': typeof import('esri/layers/GeoRSSLayer');
    'esri/layers/ImageryLayer': typeof import('esri/layers/ImageryLayer');
    'esri/layers/KMLLayer': typeof import('esri/layers/KMLLayer');
    'esri/layers/MapNotesLayer': typeof import('esri/layers/MapNotesLayer');
    'esri/layers/OGCFeatureLayer': typeof import('esri/layers/OGCFeatureLayer');
    'esri/layers/OpenStreetMapLayer': typeof import('esri/layers/OpenStreetMapLayer');
    'esri/layers/StreamLayer': typeof import('esri/layers/StreamLayer');
    'esri/layers/WebTileLayer': typeof import('esri/layers/WebTileLayer');
    'esri/webmap/Bookmark': typeof import('esri/webmap/Bookmark');
    'esri/widgets/Bookmarks': typeof import('esri/widgets/Bookmarks');
    'esri/symbols/callouts/LineCallout3D': typeof import('esri/symbols/callouts/LineCallout3D');
    'esri/widgets/smartMapping/ClassedColorSlider': typeof import('esri/widgets/smartMapping/ClassedColorSlider');
    'esri/widgets/smartMapping/ClassedSizeSlider': typeof import('esri/widgets/smartMapping/ClassedSizeSlider');
    'esri/widgets/smartMapping/ClassedColorSlider/ClassedColorSliderViewModel': typeof import('esri/widgets/smartMapping/ClassedColorSlider/ClassedColorSliderViewModel');
    'esri/widgets/smartMapping/ClassedSizeSlider/ClassedSizeSliderViewModel': typeof import('esri/widgets/smartMapping/ClassedSizeSlider/ClassedSizeSliderViewModel');
    'esri/core/workers/Connection': typeof import('esri/core/workers/Connection');
    'esri/views/navigation/Navigation': typeof import('esri/views/navigation/Navigation');
    'esri/geometry/geometryEngineAsync': typeof import('esri/geometry/geometryEngineAsync');
    'esri/tasks/support/BufferParameters': typeof import('esri/tasks/support/BufferParameters');
    'esri/layers/buildingSublayers/BuildingComponentSublayer': typeof import('esri/layers/buildingSublayers/BuildingComponentSublayer');
    'esri/widgets/BuildingExplorer': typeof import('esri/widgets/BuildingExplorer');
    'esri/widgets/BuildingExplorer/BuildingExplorerViewModel': typeof import('esri/widgets/BuildingExplorer/BuildingExplorerViewModel');
    'esri/layers/support/BuildingSummaryStatistics': typeof import('esri/layers/support/BuildingSummaryStatistics');
    'esri/layers/support/BuildingFilter': typeof import('esri/layers/support/BuildingFilter');
    'esri/layers/buildingSublayers/BuildingGroupSublayer': typeof import('esri/layers/buildingSublayers/BuildingGroupSublayer');
    'esri/views/layers/BuildingSceneLayerView': typeof import('esri/views/layers/BuildingSceneLayerView');
    'esri/layers/buildingSublayers/BuildingSublayer': typeof import('esri/layers/buildingSublayers/BuildingSublayer');
    'esri/widgets/FeatureTable/Grid/support/ButtonMenu': typeof import('esri/widgets/FeatureTable/Grid/support/ButtonMenu');
    'esri/widgets/FeatureTable/Grid/support/ButtonMenuViewModel': typeof import('esri/widgets/FeatureTable/Grid/support/ButtonMenuViewModel');
    'esri/geometry/Extent': typeof import('esri/geometry/Extent');
    'esri/geometry/Geometry': typeof import('esri/geometry/Geometry');
    'esri/geometry/Point': typeof import('esri/geometry/Point');
    'esri/core/sql/WhereClause': typeof import('esri/core/sql/WhereClause');
    'esri/tasks/support/LengthsParameters': typeof import('esri/tasks/support/LengthsParameters');
    'esri/symbols/LabelSymbol3D': typeof import('esri/symbols/LabelSymbol3D');
    'esri/symbols/PointSymbol3D': typeof import('esri/symbols/PointSymbol3D');
    'esri/symbols/callouts/Callout3D': typeof import('esri/symbols/callouts/Callout3D');
    'esri/Camera': typeof import('esri/Camera');
    'esri/Viewpoint': typeof import('esri/Viewpoint');
    'esri/widgets/Editor/CreateWorkflow': typeof import('esri/widgets/Editor/CreateWorkflow');
    'esri/widgets/Editor/UpdateWorkflow': typeof import('esri/widgets/Editor/UpdateWorkflow');
    'esri/widgets/Editor/Workflow': typeof import('esri/widgets/Editor/Workflow');
    'esri/widgets/ElevationProfile/ElevationProfileViewModel': typeof import('esri/widgets/ElevationProfile/ElevationProfileViewModel');
    'esri/widgets/Home': typeof import('esri/widgets/Home');
    'esri/widgets/Home/HomeViewModel': typeof import('esri/widgets/Home/HomeViewModel');
    'esri/tasks/Geoprocessor': typeof import('esri/tasks/Geoprocessor');
    'esri/Ground': typeof import('esri/Ground');
    'esri/layers/ElevationLayer': typeof import('esri/layers/ElevationLayer');
    'esri/layers/IntegratedMeshLayer': typeof import('esri/layers/IntegratedMeshLayer');
    'esri/layers/Layer': typeof import('esri/layers/Layer');
    'esri/layers/PointCloudLayer': typeof import('esri/layers/PointCloudLayer');
    'esri/layers/UnknownLayer': typeof import('esri/layers/UnknownLayer');
    'esri/layers/UnsupportedLayer': typeof import('esri/layers/UnsupportedLayer');
    'esri/layers/support/Sublayer': typeof import('esri/layers/support/Sublayer');
    'esri/widgets/Locate': typeof import('esri/widgets/Locate');
    'esri/widgets/Locate/LocateViewModel': typeof import('esri/widgets/Locate/LocateViewModel');
    'esri/widgets/Editor/UpdateWorkflowData': typeof import('esri/widgets/Editor/UpdateWorkflowData');
    'esri/geometry/support/webMercatorUtils': typeof import('esri/geometry/support/webMercatorUtils');
    'esri/views/draw/DrawAction': typeof import('esri/views/draw/DrawAction');
    'esri/views/draw/MultipointDrawAction': typeof import('esri/views/draw/MultipointDrawAction');
    'esri/views/draw/PointDrawAction': typeof import('esri/views/draw/PointDrawAction');
    'esri/views/draw/PolygonDrawAction': typeof import('esri/views/draw/PolygonDrawAction');
    'esri/views/draw/PolylineDrawAction': typeof import('esri/views/draw/PolylineDrawAction');
    'esri/views/draw/SegmentDrawAction': typeof import('esri/views/draw/SegmentDrawAction');
    'esri/widgets/Zoom/ZoomViewModel': typeof import('esri/widgets/Zoom/ZoomViewModel');
    'esri/symbols/LineSymbol3DLayer': typeof import('esri/symbols/LineSymbol3DLayer');
    'esri/symbols/SimpleLineSymbol': typeof import('esri/symbols/SimpleLineSymbol');
    'esri/layers/support/Relationship': typeof import('esri/layers/support/Relationship');
    'esri/symbols/ExtrudeSymbol3DLayer': typeof import('esri/symbols/ExtrudeSymbol3DLayer');
    'esri/symbols/FillSymbol3DLayer': typeof import('esri/symbols/FillSymbol3DLayer');
    'esri/tasks/support/ImageIdentifyResult': typeof import('esri/tasks/support/ImageIdentifyResult');
    'esri/tasks/support/ImageServiceIdentifyResult': typeof import('esri/tasks/support/ImageServiceIdentifyResult');
    'esri/portal/PortalQueryParams': typeof import('esri/portal/PortalQueryParams');
    'esri/views/2d/ViewState': typeof import('esri/views/2d/ViewState');
    'esri/widgets/Directions/DirectionsViewModel': typeof import('esri/widgets/Directions/DirectionsViewModel');
    'esri/layers/support/ElevationSampler': typeof import('esri/layers/support/ElevationSampler');
    'esri/popup/content/support/ChartMediaInfoValue': typeof import('esri/popup/content/support/ChartMediaInfoValue');
    'esri/popup/content/support/ChartMediaInfoValueSeries': typeof import('esri/popup/content/support/ChartMediaInfoValueSeries');
    'esri/identity/IdentityManager': typeof import('esri/identity/IdentityManager');
    'esri/symbols': typeof import('esri/symbols');
    'esri/symbols/CIMSymbol': typeof import('esri/symbols/CIMSymbol');
    'esri/widgets/ScaleRangeSlider/ScaleRanges': typeof import('esri/widgets/ScaleRangeSlider/ScaleRanges');
    'esri/smartMapping/statistics/classBreaks': typeof import('esri/smartMapping/statistics/classBreaks');
    'esri/renderers/support/ClassBreakInfo': typeof import('esri/renderers/support/ClassBreakInfo');
    'esri/rasterRenderers': typeof import('esri/rasterRenderers');
    'esri/renderers': typeof import('esri/renderers');
    'esri/widgets/Compass': typeof import('esri/widgets/Compass');
    'esri/widgets/CoordinateConversion': typeof import('esri/widgets/CoordinateConversion');
    'esri/widgets/Daylight': typeof import('esri/widgets/Daylight');
    'esri/widgets/Directions': typeof import('esri/widgets/Directions');
    'esri/widgets/DirectLineMeasurement3D': typeof import('esri/widgets/DirectLineMeasurement3D');
    'esri/widgets/DistanceMeasurement2D': typeof import('esri/widgets/DistanceMeasurement2D');
    'esri/widgets/ElevationProfile': typeof import('esri/widgets/ElevationProfile');
    'esri/widgets/Feature': typeof import('esri/widgets/Feature');
    'esri/widgets/FeatureForm': typeof import('esri/widgets/FeatureForm');
    'esri/widgets/FeatureTemplates': typeof import('esri/widgets/FeatureTemplates');
    'esri/widgets/Fullscreen': typeof import('esri/widgets/Fullscreen');
    'esri/widgets/LayerList': typeof import('esri/widgets/LayerList');
    'esri/widgets/LineOfSight': typeof import('esri/widgets/LineOfSight');
    'esri/widgets/NavigationToggle': typeof import('esri/widgets/NavigationToggle');
    'esri/widgets/ScaleBar': typeof import('esri/widgets/ScaleBar');
    'esri/widgets/ScaleRangeSlider': typeof import('esri/widgets/ScaleRangeSlider');
    'esri/widgets/Slice': typeof import('esri/widgets/Slice');
    'esri/widgets/Slider': typeof import('esri/widgets/Slider');
    'esri/widgets/Swipe': typeof import('esri/widgets/Swipe');
    'esri/widgets/TableList': typeof import('esri/widgets/TableList');
    'esri/widgets/TimeSlider': typeof import('esri/widgets/TimeSlider');
    'esri/widgets/Track': typeof import('esri/widgets/Track');
    'esri/widgets/Widget': typeof import('esri/widgets/Widget');
    'esri/widgets/Zoom': typeof import('esri/widgets/Zoom');
    'esri/widgets/Search/SearchResultRenderer': typeof import('esri/widgets/Search/SearchResultRenderer');
    'esri/widgets/smartMapping/ColorSizeSlider': typeof import('esri/widgets/smartMapping/ColorSizeSlider');
    'esri/widgets/smartMapping/ColorSlider': typeof import('esri/widgets/smartMapping/ColorSlider');
    'esri/widgets/smartMapping/HeatmapSlider': typeof import('esri/widgets/smartMapping/HeatmapSlider');
    'esri/widgets/smartMapping/OpacitySlider': typeof import('esri/widgets/smartMapping/OpacitySlider');
    'esri/widgets/smartMapping/SizeSlider': typeof import('esri/widgets/smartMapping/SizeSlider');
    'esri/widgets/smartMapping/SmartMappingSliderBase': typeof import('esri/widgets/smartMapping/SmartMappingSliderBase');
    'esri/widgets/support/DatePicker': typeof import('esri/widgets/support/DatePicker');
    'esri/widgets/support/TimePicker': typeof import('esri/widgets/support/TimePicker');
    'esri/widgets/LayerList/ListItemPanel': typeof import('esri/widgets/LayerList/ListItemPanel');
    'esri/widgets/DirectLineMeasurement3D/DirectLineMeasurement3DViewModel': typeof import('esri/widgets/DirectLineMeasurement3D/DirectLineMeasurement3DViewModel');
    'esri/widgets/DistanceMeasurement2D/DistanceMeasurement2DViewModel': typeof import('esri/widgets/DistanceMeasurement2D/DistanceMeasurement2DViewModel');
    'esri/widgets/LineOfSight/LineOfSightViewModel': typeof import('esri/widgets/LineOfSight/LineOfSightViewModel');
    'esri/widgets/Slice/SliceViewModel': typeof import('esri/widgets/Slice/SliceViewModel');
    'esri/TimeExtent': typeof import('esri/TimeExtent');
    'esri/TimeInterval': typeof import('esri/TimeInterval');
    'esri/core/lang': typeof import('esri/core/lang');
    'esri/form/ExpressionInfo': typeof import('esri/form/ExpressionInfo');
    'esri/form/FormTemplate': typeof import('esri/form/FormTemplate');
    'esri/form/elements/FieldElement': typeof import('esri/form/elements/FieldElement');
    'esri/form/elements/GroupElement': typeof import('esri/form/elements/GroupElement');
    'esri/form/elements/inputs/DateTimePickerInput': typeof import('esri/form/elements/inputs/DateTimePickerInput');
    'esri/form/elements/inputs/TextAreaInput': typeof import('esri/form/elements/inputs/TextAreaInput');
    'esri/form/elements/inputs/TextBoxInput': typeof import('esri/form/elements/inputs/TextBoxInput');
    'esri/form/elements/inputs/TextInput': typeof import('esri/form/elements/inputs/TextInput');
    'esri/geometry/SpatialReference': typeof import('esri/geometry/SpatialReference');
    'esri/geometry/support/MeshComponent': typeof import('esri/geometry/support/MeshComponent');
    'esri/geometry/support/MeshTexture': typeof import('esri/geometry/support/MeshTexture');
    'esri/layers/support/DimensionalDefinition': typeof import('esri/layers/support/DimensionalDefinition');
    'esri/layers/support/FeatureReductionCluster': typeof import('esri/layers/support/FeatureReductionCluster');
    'esri/layers/support/LabelClass': typeof import('esri/layers/support/LabelClass');
    'esri/layers/support/SceneModification': typeof import('esri/layers/support/SceneModification');
    'esri/layers/support/SceneModifications': typeof import('esri/layers/support/SceneModifications');
    'esri/layers/support/TileMatrixSet': typeof import('esri/layers/support/TileMatrixSet');
    'esri/layers/support/TimeInfo': typeof import('esri/layers/support/TimeInfo');
    'esri/layers/support/WMSSublayer': typeof import('esri/layers/support/WMSSublayer');
    'esri/layers/support/WMTSStyle': typeof import('esri/layers/support/WMTSStyle');
    'esri/layers/support/WMTSSublayer': typeof import('esri/layers/support/WMTSSublayer');
    'esri/popup/ExpressionInfo': typeof import('esri/popup/ExpressionInfo');
    'esri/popup/FieldInfo': typeof import('esri/popup/FieldInfo');
    'esri/popup/LayerOptions': typeof import('esri/popup/LayerOptions');
    'esri/popup/RelatedRecordsInfo': typeof import('esri/popup/RelatedRecordsInfo');
    'esri/popup/content/CustomContent': typeof import('esri/popup/content/CustomContent');
    'esri/popup/content/FieldsContent': typeof import('esri/popup/content/FieldsContent');
    'esri/popup/content/MediaContent': typeof import('esri/popup/content/MediaContent');
    'esri/popup/content/TextContent': typeof import('esri/popup/content/TextContent');
    'esri/popup/content/support/ImageMediaInfoValue': typeof import('esri/popup/content/support/ImageMediaInfoValue');
    'esri/popup/support/FieldInfoFormat': typeof import('esri/popup/support/FieldInfoFormat');
    'esri/popup/support/RelatedRecordsInfoFieldOrder': typeof import('esri/popup/support/RelatedRecordsInfoFieldOrder');
    'esri/renderers/PointCloudClassBreaksRenderer': typeof import('esri/renderers/PointCloudClassBreaksRenderer');
    'esri/renderers/PointCloudRenderer': typeof import('esri/renderers/PointCloudRenderer');
    'esri/renderers/PointCloudRGBRenderer': typeof import('esri/renderers/PointCloudRGBRenderer');
    'esri/renderers/PointCloudStretchRenderer': typeof import('esri/renderers/PointCloudStretchRenderer');
    'esri/renderers/PointCloudUniqueValueRenderer': typeof import('esri/renderers/PointCloudUniqueValueRenderer');
    'esri/renderers/RasterColormapRenderer': typeof import('esri/renderers/RasterColormapRenderer');
    'esri/renderers/RasterStretchRenderer': typeof import('esri/renderers/RasterStretchRenderer');
    'esri/renderers/SimpleRenderer': typeof import('esri/renderers/SimpleRenderer');
    'esri/renderers/support/HeatmapColorStop': typeof import('esri/renderers/support/HeatmapColorStop');
    'esri/renderers/support/UniqueValueInfo': typeof import('esri/renderers/support/UniqueValueInfo');
    'esri/renderers/visualVariables/ColorVariable': typeof import('esri/renderers/visualVariables/ColorVariable');
    'esri/renderers/visualVariables/OpacityVariable': typeof import('esri/renderers/visualVariables/OpacityVariable');
    'esri/renderers/visualVariables/support/ColorStop': typeof import('esri/renderers/visualVariables/support/ColorStop');
    'esri/renderers/visualVariables/support/OpacityStop': typeof import('esri/renderers/visualVariables/support/OpacityStop');
    'esri/renderers/visualVariables/support/SizeStop': typeof import('esri/renderers/visualVariables/support/SizeStop');
    'esri/symbols/Font': typeof import('esri/symbols/Font');
    'esri/symbols/LineSymbol3D': typeof import('esri/symbols/LineSymbol3D');
    'esri/symbols/MeshSymbol3D': typeof import('esri/symbols/MeshSymbol3D');
    'esri/symbols/PictureFillSymbol': typeof import('esri/symbols/PictureFillSymbol');
    'esri/symbols/PolygonSymbol3D': typeof import('esri/symbols/PolygonSymbol3D');
    'esri/symbols/SimpleFillSymbol': typeof import('esri/symbols/SimpleFillSymbol');
    'esri/symbols/TextSymbol3DLayer': typeof import('esri/symbols/TextSymbol3DLayer');
    'esri/symbols/WaterSymbol3DLayer': typeof import('esri/symbols/WaterSymbol3DLayer');
    'esri/symbols/WebStyleSymbol': typeof import('esri/symbols/WebStyleSymbol');
    'esri/symbols/edges/Edges3D': typeof import('esri/symbols/edges/Edges3D');
    'esri/symbols/edges/SketchEdges3D': typeof import('esri/symbols/edges/SketchEdges3D');
    'esri/symbols/edges/SolidEdges3D': typeof import('esri/symbols/edges/SolidEdges3D');
    'esri/symbols/patterns/StylePattern3D': typeof import('esri/symbols/patterns/StylePattern3D');
    'esri/tasks/support/MultipartColorRamp': typeof import('esri/tasks/support/MultipartColorRamp');
    'esri/tasks/support/RelationshipQuery': typeof import('esri/tasks/support/RelationshipQuery');
    'esri/tasks/support/StatisticDefinition': typeof import('esri/tasks/support/StatisticDefinition');
    'esri/views/layers/support/FeatureEffect': typeof import('esri/views/layers/support/FeatureEffect');
    'esri/views/layers/support/FeatureFilter': typeof import('esri/views/layers/support/FeatureFilter');
    'esri/webdoc/applicationProperties/SearchLayer': typeof import('esri/webdoc/applicationProperties/SearchLayer');
    'esri/webdoc/applicationProperties/SearchLayerField': typeof import('esri/webdoc/applicationProperties/SearchLayerField');
    'esri/webdoc/applicationProperties/SearchTable': typeof import('esri/webdoc/applicationProperties/SearchTable');
    'esri/webdoc/applicationProperties/SearchTableField': typeof import('esri/webdoc/applicationProperties/SearchTableField');
    'esri/webdoc/applicationProperties/Viewing': typeof import('esri/webdoc/applicationProperties/Viewing');
    'esri/webmap/background/ColorBackground': typeof import('esri/webmap/background/ColorBackground');
    'esri/webscene/InitialViewProperties': typeof import('esri/webscene/InitialViewProperties');
    'esri/webscene/Lighting': typeof import('esri/webscene/Lighting');
    'esri/webscene/Presentation': typeof import('esri/webscene/Presentation');
    'esri/webscene/background/ColorBackground': typeof import('esri/webscene/background/ColorBackground');
    'esri/widgets/FeatureTemplates/TemplateItem': typeof import('esri/widgets/FeatureTemplates/TemplateItem');
    'esri/widgets/Slice/SlicePlane': typeof import('esri/widgets/Slice/SlicePlane');
    'esri/smartMapping/symbology/color': typeof import('esri/smartMapping/symbology/color');
    'esri/smartMapping/symbology/dotDensity': typeof import('esri/smartMapping/symbology/dotDensity');
    'esri/smartMapping/symbology/heatmap': typeof import('esri/smartMapping/symbology/heatmap');
    'esri/smartMapping/symbology/location': typeof import('esri/smartMapping/symbology/location');
    'esri/smartMapping/symbology/predominance': typeof import('esri/smartMapping/symbology/predominance');
    'esri/smartMapping/symbology/relationship': typeof import('esri/smartMapping/symbology/relationship');
    'esri/smartMapping/symbology/size': typeof import('esri/smartMapping/symbology/size');
    'esri/smartMapping/symbology/type': typeof import('esri/smartMapping/symbology/type');
    'esri/tasks/support/ClosestFacilitySolveResult': typeof import('esri/tasks/support/ClosestFacilitySolveResult');
    'esri/tasks/ClosestFacilityTask': typeof import('esri/tasks/ClosestFacilityTask');
    'esri/smartMapping/labels/clusters': typeof import('esri/smartMapping/labels/clusters');
    'esri/smartMapping/popup/clusters': typeof import('esri/smartMapping/popup/clusters');
    'esri/layers/support/CodedValueDomain': typeof import('esri/layers/support/CodedValueDomain');
    'esri/renderers/support/ColormapInfo': typeof import('esri/renderers/support/ColormapInfo');
    'esri/symbols/LineSymbol': typeof import('esri/symbols/LineSymbol');
    'esri/symbols/LineSymbolMarker': typeof import('esri/symbols/LineSymbolMarker');
    'esri/symbols/Symbol': typeof import('esri/symbols/Symbol');
    'esri/widgets/ElevationProfile/ElevationProfileLine': typeof import('esri/widgets/ElevationProfile/ElevationProfileLine');
    'esri/widgets/ElevationProfile/ElevationProfileLineGround': typeof import('esri/widgets/ElevationProfile/ElevationProfileLineGround');
    'esri/widgets/ElevationProfile/ElevationProfileLineInput': typeof import('esri/widgets/ElevationProfile/ElevationProfileLineInput');
    'esri/widgets/ElevationProfile/ElevationProfileLineQuery': typeof import('esri/widgets/ElevationProfile/ElevationProfileLineQuery');
    'esri/widgets/ElevationProfile/ElevationProfileLineView': typeof import('esri/widgets/ElevationProfile/ElevationProfileLineView');
    'esri/tasks/support/ColorRamp': typeof import('esri/tasks/support/ColorRamp');
    'esri/widgets/smartMapping/ColorSizeSlider/ColorSizeSliderViewModel': typeof import('esri/widgets/smartMapping/ColorSizeSlider/ColorSizeSliderViewModel');
    'esri/widgets/smartMapping/ColorSlider/ColorSliderViewModel': typeof import('esri/widgets/smartMapping/ColorSlider/ColorSliderViewModel');
    'esri/views/support/colorUtils': typeof import('esri/views/support/colorUtils');
    'esri/widgets/Compass/CompassViewModel': typeof import('esri/widgets/Compass/CompassViewModel');
    'esri/support/popupUtils': typeof import('esri/support/popupUtils');
    'esri/views/layers/StreamLayerView': typeof import('esri/views/layers/StreamLayerView');
    'esri/tasks/support/FindParameters': typeof import('esri/tasks/support/FindParameters');
    'esri/popup/content/Content': typeof import('esri/popup/content/Content');
    'esri/widgets/Feature/FeatureViewModel': typeof import('esri/widgets/Feature/FeatureViewModel');
    'esri/smartMapping/renderers/univariateColorSize': typeof import('esri/smartMapping/renderers/univariateColorSize');
    'esri/widgets/CoordinateConversion/support/Conversion': typeof import('esri/widgets/CoordinateConversion/support/Conversion');
    'esri/widgets/CoordinateConversion/support/Format': typeof import('esri/widgets/CoordinateConversion/support/Format');
    'esri/widgets/CoordinateConversion/CoordinateConversionViewModel': typeof import('esri/widgets/CoordinateConversion/CoordinateConversionViewModel');
    'esri/intl': typeof import('esri/intl');
    'esri/geometry/coordinateFormatter': typeof import('esri/geometry/coordinateFormatter');
    'esri/core/promiseUtils': typeof import('esri/core/promiseUtils');
    'esri/layers/support/TileInfo': typeof import('esri/layers/support/TileInfo');
    'esri/portal/PortalFolder': typeof import('esri/portal/PortalFolder');
    'esri/portal/PortalRating': typeof import('esri/portal/PortalRating');
    'esri/geometry/support/meshUtils': typeof import('esri/geometry/support/meshUtils');
    'esri/smartMapping/renderers/type': typeof import('esri/smartMapping/renderers/type');
    'esri/smartMapping/renderers/dotDensity': typeof import('esri/smartMapping/renderers/dotDensity');
    'esri/smartMapping/renderers/heatmap': typeof import('esri/smartMapping/renderers/heatmap');
    'esri/smartMapping/renderers/location': typeof import('esri/smartMapping/renderers/location');
    'esri/smartMapping/renderers/predominance': typeof import('esri/smartMapping/renderers/predominance');
    'esri/smartMapping/renderers/relationship': typeof import('esri/smartMapping/renderers/relationship');
    'esri/smartMapping/renderers/opacity': typeof import('esri/smartMapping/renderers/opacity');
    'esri/widgets/Editor/CreateWorkflowData': typeof import('esri/widgets/Editor/CreateWorkflowData');
    'esri/identity/Credential': typeof import('esri/identity/Credential');
    'esri/widgets/Daylight/DaylightViewModel': typeof import('esri/widgets/Daylight/DaylightViewModel');
    'esri/widgets/Print/CustomTemplate': typeof import('esri/widgets/Print/CustomTemplate');
    'esri/tasks/support/DataFile': typeof import('esri/tasks/support/DataFile');
    'esri/tasks/support/DataLayer': typeof import('esri/tasks/support/DataLayer');
    'esri/tasks/support/ParameterValue': typeof import('esri/tasks/support/ParameterValue');
    'esri/layers/support/FieldsIndex': typeof import('esri/layers/support/FieldsIndex');
    'esri/widgets/support/DatePickerViewModel': typeof import('esri/widgets/support/DatePickerViewModel');
    'esri/core/HandleOwner': typeof import('esri/core/HandleOwner');
    'esri/form/elements/Element': typeof import('esri/form/elements/Element');
    'esri/geometry/HeightModelInfo': typeof import('esri/geometry/HeightModelInfo');
    'esri/layers/pointCloudFilters/PointCloudFilter': typeof import('esri/layers/pointCloudFilters/PointCloudFilter');
    'esri/layers/pointCloudFilters/PointCloudReturnFilter': typeof import('esri/layers/pointCloudFilters/PointCloudReturnFilter');
    'esri/layers/pointCloudFilters/PointCloudValueFilter': typeof import('esri/layers/pointCloudFilters/PointCloudValueFilter');
    'esri/layers/support/Domain': typeof import('esri/layers/support/Domain');
    'esri/layers/support/FeatureReductionSelection': typeof import('esri/layers/support/FeatureReductionSelection');
    'esri/layers/support/FeatureTemplate': typeof import('esri/layers/support/FeatureTemplate');
    'esri/layers/support/FeatureType': typeof import('esri/layers/support/FeatureType');
    'esri/layers/support/ImageParameters': typeof import('esri/layers/support/ImageParameters');
    'esri/layers/support/InheritedDomain': typeof import('esri/layers/support/InheritedDomain');
    'esri/layers/support/KMLSublayer': typeof import('esri/layers/support/KMLSublayer');
    'esri/layers/support/LOD': typeof import('esri/layers/support/LOD');
    'esri/layers/support/MapImage': typeof import('esri/layers/support/MapImage');
    'esri/layers/support/RangeDomain': typeof import('esri/layers/support/RangeDomain');
    'esri/layers/support/RasterFunction': typeof import('esri/layers/support/RasterFunction');
    'esri/portal/PortalItemResource': typeof import('esri/portal/PortalItemResource');
    'esri/portal/PortalQueryResult': typeof import('esri/portal/PortalQueryResult');
    'esri/renderers/visualVariables/VisualVariable': typeof import('esri/renderers/visualVariables/VisualVariable');
    'esri/symbols/FillSymbol': typeof import('esri/symbols/FillSymbol');
    'esri/symbols/Symbol3D': typeof import('esri/symbols/Symbol3D');
    'esri/symbols/Symbol3DLayer': typeof import('esri/symbols/Symbol3DLayer');
    'esri/tasks/FindTask': typeof import('esri/tasks/FindTask');
    'esri/tasks/IdentifyTask': typeof import('esri/tasks/IdentifyTask');
    'esri/tasks/ImageIdentifyTask': typeof import('esri/tasks/ImageIdentifyTask');
    'esri/tasks/ImageServiceIdentifyTask': typeof import('esri/tasks/ImageServiceIdentifyTask');
    'esri/tasks/PrintTask': typeof import('esri/tasks/PrintTask');
    'esri/tasks/QueryTask': typeof import('esri/tasks/QueryTask');
    'esri/tasks/RouteTask': typeof import('esri/tasks/RouteTask');
    'esri/tasks/ServiceAreaTask': typeof import('esri/tasks/ServiceAreaTask');
    'esri/tasks/Task': typeof import('esri/tasks/Task');
    'esri/tasks/support/DensifyParameters': typeof import('esri/tasks/support/DensifyParameters');
    'esri/tasks/support/DirectionsFeatureSet': typeof import('esri/tasks/support/DirectionsFeatureSet');
    'esri/tasks/support/DistanceParameters': typeof import('esri/tasks/support/DistanceParameters');
    'esri/tasks/support/FeatureSet': typeof import('esri/tasks/support/FeatureSet');
    'esri/tasks/support/FindResult': typeof import('esri/tasks/support/FindResult');
    'esri/tasks/support/GeneralizeParameters': typeof import('esri/tasks/support/GeneralizeParameters');
    'esri/tasks/support/GPMessage': typeof import('esri/tasks/support/GPMessage');
    'esri/tasks/support/IdentifyParameters': typeof import('esri/tasks/support/IdentifyParameters');
    'esri/tasks/support/IdentifyResult': typeof import('esri/tasks/support/IdentifyResult');
    'esri/tasks/support/ImageHistogramParameters': typeof import('esri/tasks/support/ImageHistogramParameters');
    'esri/tasks/support/ImageIdentifyParameters': typeof import('esri/tasks/support/ImageIdentifyParameters');
    'esri/tasks/support/ImageServiceIdentifyParameters': typeof import('esri/tasks/support/ImageServiceIdentifyParameters');
    'esri/tasks/support/JobInfo': typeof import('esri/tasks/support/JobInfo');
    'esri/tasks/support/LegendLayer': typeof import('esri/tasks/support/LegendLayer');
    'esri/tasks/support/LinearUnit': typeof import('esri/tasks/support/LinearUnit');
    'esri/tasks/support/NAMessage': typeof import('esri/tasks/support/NAMessage');
    'esri/tasks/support/PrintParameters': typeof import('esri/tasks/support/PrintParameters');
    'esri/tasks/support/ProjectParameters': typeof import('esri/tasks/support/ProjectParameters');
    'esri/tasks/support/RasterData': typeof import('esri/tasks/support/RasterData');
    'esri/tasks/support/RelationParameters': typeof import('esri/tasks/support/RelationParameters');
    'esri/tasks/support/RouteResult': typeof import('esri/tasks/support/RouteResult');
    'esri/tasks/support/ServiceAreaSolveResult': typeof import('esri/tasks/support/ServiceAreaSolveResult');
    'esri/tasks/support/TrimExtendParameters': typeof import('esri/tasks/support/TrimExtendParameters');
    'esri/views/GroundView': typeof import('esri/views/GroundView');
    'esri/views/ViewAnimation': typeof import('esri/views/ViewAnimation');
    'esri/views/input/Input': typeof import('esri/views/input/Input');
    'esri/views/input/gamepad/GamepadInputDevice': typeof import('esri/views/input/gamepad/GamepadInputDevice');
    'esri/views/input/gamepad/GamepadSettings': typeof import('esri/views/input/gamepad/GamepadSettings');
    'esri/views/layers/ImageryLayerView': typeof import('esri/views/layers/ImageryLayerView');
    'esri/views/layers/LayerView': typeof import('esri/views/layers/LayerView');
    'esri/views/navigation/gamepad/GamepadSettings': typeof import('esri/views/navigation/gamepad/GamepadSettings');
    'esri/widgets/Editor/Edits': typeof import('esri/widgets/Editor/Edits');
    'esri/widgets/FeatureForm/FeatureFormViewModel': typeof import('esri/widgets/FeatureForm/FeatureFormViewModel');
    'esri/widgets/FeatureForm/FieldConfig': typeof import('esri/widgets/FeatureForm/FieldConfig');
    'esri/widgets/FeatureForm/FieldGroupConfig': typeof import('esri/widgets/FeatureForm/FieldGroupConfig');
    'esri/widgets/FeatureForm/InputField': typeof import('esri/widgets/FeatureForm/InputField');
    'esri/widgets/FeatureForm/InputFieldGroup': typeof import('esri/widgets/FeatureForm/InputFieldGroup');
    'esri/widgets/FeatureTable/FieldColumnConfig': typeof import('esri/widgets/FeatureTable/FieldColumnConfig');
    'esri/widgets/FeatureTemplates/FeatureTemplatesViewModel': typeof import('esri/widgets/FeatureTemplates/FeatureTemplatesViewModel');
    'esri/widgets/FeatureTemplates/TemplateItemGroup': typeof import('esri/widgets/FeatureTemplates/TemplateItemGroup');
    'esri/widgets/Fullscreen/FullscreenViewModel': typeof import('esri/widgets/Fullscreen/FullscreenViewModel');
    'esri/widgets/LayerList/LayerListViewModel': typeof import('esri/widgets/LayerList/LayerListViewModel');
    'esri/widgets/LineOfSight/LineOfSightTarget': typeof import('esri/widgets/LineOfSight/LineOfSightTarget');
    'esri/widgets/NavigationToggle/NavigationToggleViewModel': typeof import('esri/widgets/NavigationToggle/NavigationToggleViewModel');
    'esri/widgets/ScaleBar/ScaleBarViewModel': typeof import('esri/widgets/ScaleBar/ScaleBarViewModel');
    'esri/widgets/ScaleRangeSlider/ScaleRangeSliderViewModel': typeof import('esri/widgets/ScaleRangeSlider/ScaleRangeSliderViewModel');
    'esri/widgets/Slider/SliderViewModel': typeof import('esri/widgets/Slider/SliderViewModel');
    'esri/widgets/Spinner/SpinnerViewModel': typeof import('esri/widgets/Spinner/SpinnerViewModel');
    'esri/widgets/Swipe/SwipeViewModel': typeof import('esri/widgets/Swipe/SwipeViewModel');
    'esri/widgets/TimeSlider/TimeSliderViewModel': typeof import('esri/widgets/TimeSlider/TimeSliderViewModel');
    'esri/widgets/Track/TrackViewModel': typeof import('esri/widgets/Track/TrackViewModel');
    'esri/widgets/smartMapping/SmartMappingPrimaryHandleSliderViewModel': typeof import('esri/widgets/smartMapping/SmartMappingPrimaryHandleSliderViewModel');
    'esri/widgets/smartMapping/SmartMappingSliderViewModel': typeof import('esri/widgets/smartMapping/SmartMappingSliderViewModel');
    'esri/widgets/smartMapping/HeatmapSlider/HeatmapSliderViewModel': typeof import('esri/widgets/smartMapping/HeatmapSlider/HeatmapSliderViewModel');
    'esri/widgets/smartMapping/OpacitySlider/OpacitySliderViewModel': typeof import('esri/widgets/smartMapping/OpacitySlider/OpacitySliderViewModel');
    'esri/widgets/smartMapping/SizeSlider/SizeSliderViewModel': typeof import('esri/widgets/smartMapping/SizeSlider/SizeSliderViewModel');
    'esri/widgets/support/TimePickerViewModel': typeof import('esri/widgets/support/TimePickerViewModel');
    'esri/core/Error': typeof import('esri/core/Error');
    'esri/views/3d/support/LayerPerformanceInfo': typeof import('esri/views/3d/support/LayerPerformanceInfo');
    'esri/views/3d/support/SceneViewPerformanceInfo': typeof import('esri/views/3d/support/SceneViewPerformanceInfo');
    'esri/form/support/elements': typeof import('esri/form/support/elements');
    'esri/request': typeof import('esri/request');
    'esri/core/watchUtils': typeof import('esri/core/watchUtils');
    'esri/geometry': typeof import('esri/geometry');
    'esri/layers/support/fieldUtils': typeof import('esri/layers/support/fieldUtils');
    'esri/widgets/smartMapping/support/utils': typeof import('esri/widgets/smartMapping/support/utils');
    'esri/geometry/support/jsonUtils': typeof import('esri/geometry/support/jsonUtils');
    'esri/renderers/support/jsonUtils': typeof import('esri/renderers/support/jsonUtils');
    'esri/symbols/support/jsonUtils': typeof import('esri/symbols/support/jsonUtils');
    'esri/geometry/support/geodesicUtils': typeof import('esri/geometry/support/geodesicUtils');
    'esri/geometry/support/GeographicTransformation': typeof import('esri/geometry/support/GeographicTransformation');
    'esri/geometry/support/GeographicTransformationStep': typeof import('esri/geometry/support/GeographicTransformationStep');
    'esri/symbols/support/symbolUtils': typeof import('esri/symbols/support/symbolUtils');
    'esri/smartMapping/popup/templates': typeof import('esri/smartMapping/popup/templates');
    'esri/geometry/projection': typeof import('esri/geometry/projection');
    'esri/smartMapping/statistics/heatmapStatistics': typeof import('esri/smartMapping/statistics/heatmapStatistics');
    'esri/smartMapping/statistics/histogram': typeof import('esri/smartMapping/statistics/histogram');
    'esri/form/elements/support/inputs': typeof import('esri/form/elements/support/inputs');
    'esri/kernel': typeof import('esri/kernel');
    'esri/widgets/TableList/TableListViewModel': typeof import('esri/widgets/TableList/TableListViewModel');
    'esri/geometry/support/normalizeUtils': typeof import('esri/geometry/support/normalizeUtils');
    'esri/core/workers': typeof import('esri/core/workers');
    'esri/core/sql': typeof import('esri/core/sql');
    'esri/pointCloudRenderers': typeof import('esri/pointCloudRenderers');
    'esri/smartMapping/statistics/predominantCategories': typeof import('esri/smartMapping/statistics/predominantCategories');
    'esri/symbols/support/symbolPreview': typeof import('esri/symbols/support/symbolPreview');
    'esri/smartMapping/heuristics/scaleRange': typeof import('esri/smartMapping/heuristics/scaleRange');
    'esri/smartMapping/heuristics/sizeRange': typeof import('esri/smartMapping/heuristics/sizeRange');
    'esri/smartMapping/statistics/summaryStatistics': typeof import('esri/smartMapping/statistics/summaryStatistics');
    'esri/smartMapping/statistics/summaryStatisticsForAge': typeof import('esri/smartMapping/statistics/summaryStatisticsForAge');
    'esri/smartMapping/statistics/uniqueValues': typeof import('esri/smartMapping/statistics/uniqueValues');
}