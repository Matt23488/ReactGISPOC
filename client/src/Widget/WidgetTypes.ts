import React from 'react';
import { EsriTypeMap } from '../utilities/GIS';
import { ConstructorInstance, Diff, FirstConstructorArgument, Optional, Remove } from '../utilities/Types';

export type WidgetConstructorKeys = ({
    [T in keyof EsriTypeMap]: EsriTypeMap[T] extends { new(...params: never[]): __esri.Widget } ? T : never;
})[keyof EsriTypeMap];
type WidgetPropertiesTypeMap = {
    [T in WidgetConstructorKeys]: Diff<FirstConstructorArgument<EsriTypeMap[T]>, undefined>
};
export type GenericWidgetConstructorKeys = Diff<WidgetConstructorKeys, 'esri/widgets/Expand'>;

interface SpecializedWidgetPropertyTypeMap {
    'esri/widgets/Sketch': { layer: string };
    'esri/widgets/Editor': { layers?: string[] };
    'esri/widgets/FeatureTable': { layer: string };
}
export type SpecializedWidgetProperties<T extends GenericWidgetConstructorKeys> = T extends keyof SpecializedWidgetPropertyTypeMap ? SpecializedWidgetPropertyTypeMap[T] : {};

interface SpecializedWidgetPropertyRemoverTypeMap {
    'esri/widgets/Editor': 'layerInfos';
}
type SpecializedWidgetPropertyRemover<T extends GenericWidgetConstructorKeys> = T extends keyof SpecializedWidgetPropertyRemoverTypeMap ? SpecializedWidgetPropertyRemoverTypeMap[T] : never;

// TODO: widgetProperties is not working anymore. It seems to be doing a union on all possible widget properties instead of just those associated with T.
export type WidgetProperties<T extends GenericWidgetConstructorKeys> = SpecializedWidgetProperties<T> & {
    type: T;
    widgetProperties?: Optional<Remove<WidgetPropertiesTypeMap[T], keyof WidgetProperties<T> | SpecializedWidgetPropertyRemover<T>>>;
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