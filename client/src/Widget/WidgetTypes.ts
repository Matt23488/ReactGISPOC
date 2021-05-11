import React from 'react';
import { EsriTypeMap } from '../utilities/GIS';
import { ConstructorInstance, Diff, Filter, FirstConstructorArgument, Optional, Remove } from '../utilities/Types';

export type WidgetConstructorKeys = ({
    [T in keyof EsriTypeMap]: EsriTypeMap[T] extends { new(...params: never[]): __esri.Widget } ? T : never;
})[keyof EsriTypeMap];
type WidgetPropertiesTypeMap = {
    [T in WidgetConstructorKeys]: Diff<FirstConstructorArgument<EsriTypeMap[T]>, undefined>
};
export type GenericWidgetConstructorKeys = Diff<WidgetConstructorKeys, 'esri/widgets/Expand'>;

interface SpecializedWidgetPropertyTypeMap {
    'esri/widgets/Sketch': { layer: string };
    'esri/widgets/Editor': { layers?: string[], layerInfos?: undefined };
    'esri/widgets/FeatureTable': { layer: string };
}
export type SpecializedWidgetProperties<T extends GenericWidgetConstructorKeys> = T extends keyof SpecializedWidgetPropertyTypeMap ? SpecializedWidgetPropertyTypeMap[T] : {};

// interface SpecializedWidgetPropertyRemoverTypeMap {
//     'esri/widgets/Editor': 'layerInfos';
// }
// type SpecializedWidgetPropertyRemover<T extends GenericWidgetConstructorKeys> = T extends keyof SpecializedWidgetPropertyRemoverTypeMap ? SpecializedWidgetPropertyRemoverTypeMap[T] : never;

// TODO: I can't find a way to make TypeScript do what I want other than to not restrict what they can pass in on widgetProperties. I'll just
// have to document that some properties will be ignored.
// On further research, it seems that because I'm abusing T outside of it's inferred usage (type: T), TypeScript
// cannot infer any information about other types using T: https://github.com/microsoft/TypeScript/issues/30650
// Basically if I build a new type for widgetProperties, T will have to be explicitly declared when referencing <Widget />
// and also `type` will have to be set to the same value, which is ugly.
export type WidgetProperties<T extends GenericWidgetConstructorKeys> = SpecializedWidgetProperties<T> & {
    type: T;
    widgetProperties?: WidgetPropertiesTypeMap[T];
    init?: (widget: ConstructorInstance<EsriTypeMap[T]>) => void;
    id?: string;
}

export interface WidgetState<T extends GenericWidgetConstructorKeys> {
    domId: string;
    widget?: ConstructorInstance<EsriTypeMap[T]>;
}

export type MapComponentProperties = {
    children?: React.ReactNode | React.ReactNodeArray;
    position?: __esri.UIAddComponent['position'];
    className?: string;
    style?: React.CSSProperties;
} & ({
    expandable?: false;
    expandProperties?: never;
} | {
    expandable: true;
    expandProperties?: Optional<Remove<__esri.ExpandProperties, 'content' | 'view'>>;
});

export interface MapComponentState {
    domId: string;
    viewTarget?: __esri.Expand | HTMLElement;
    id: string;
}

export interface WidgetQueueItem {
    id: string;
    view: __esri.View;
    getWidget: () => __esri.Widget | HTMLElement | string;
    position: __esri.UIAddComponent['position'];
    ready: boolean;
    cancel: () => void;
}