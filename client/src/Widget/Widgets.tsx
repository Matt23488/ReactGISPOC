import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EsriTypeMap, loadTypedModules, MapChild } from '../utilities/GIS';
import { ConstructorInstance, Optional, Remove } from '../utilities/Types';
import { v4 as uuidv4 } from 'uuid';
import { DOMWidgetProperties, GenericWidgetConstructorKeys, MapWidgetProperties, SpecializedWidgetProperties, WidgetProperties, WidgetState } from './WidgetTypes';
import { dequeueWidget, queueWidget } from './WidgetQueue';
import { loadWidget } from './WidgetInitialization';
import * as mapSpy from '../MapSpy';

export function Widget<T extends GenericWidgetConstructorKeys, U extends boolean = false>(props: WidgetProperties<T, U>) {
    if (WidgetProperties.isMapWidget(props) && MapChild.guard(props)) return (
        <MapWidget
            type={props.type}
            id={props.id}
            map={props.map}
            view={props.view}
            position={props.position}
            init={props.init as (widget: ConstructorInstance<EsriTypeMap[keyof EsriTypeMap]>) => void}
            widgetProperties={props.widgetProperties}
            expandable={props.expandable}
            specialProps={props}
        />
    );

    if (WidgetProperties.isDOMWidget(props)) return (
        <DOMWidget
            type={props.type}
            id={props.id}
            mapId={props.mapId}
            domId={props.domId}
            className={props.className}
            init={props.init as (widget: ConstructorInstance<EsriTypeMap[keyof EsriTypeMap]>) => void}
            style={props.style}
            widgetProperties={props.widgetProperties}
            specialProps={props}
        />
    );

    return null;
}

class MapWidget<T extends GenericWidgetConstructorKeys, U extends boolean> extends React.Component<MapWidgetProperties<T, U> & { specialProps: SpecializedWidgetProperties<T> } & MapChild, WidgetState> {
    public constructor(props: MapWidgetProperties<T, U> & { specialProps: SpecializedWidgetProperties<T> } & MapChild) {
        super(props);
        this.state = {
            status: 'loading',
            queueInfo: {
                id: '',
                onReady: () => {}
            },
        };
        console.log(`Widget ${this.props.id} constructor`);
    }

    public shouldComponentUpdate() { return false; }

    public async componentDidMount() {
        console.log(`Widget ${this.props.id} componentDidMount`, `expandable: ${this.props.expandable}`);
        try {
            const queueInfo = queueWidget(this.props.view, () => this.state.widget!, this.props.position);
            this.setState({ queueInfo });

            let widget: __esri.Widget;
            let expand: __esri.Expand | undefined;
            if (WidgetProperties.isExpandableMapWidget(this.props)) {
                [ widget, expand ] = await loadWidget<T>({ ...this.props, ...this.props.specialProps });
            } else widget = await loadWidget<T>({ ...this.props, ...this.props.specialProps } as MapWidgetProperties<T, false> & MapChild);
            
            this.setState({ widget: expand || widget, status: 'loaded' });
            if (this.props.init) this.props.init(widget as ConstructorInstance<EsriTypeMap[T]>);
            this.state.queueInfo.onReady();
        } catch (e) {
            console.error(e);
            dequeueWidget(this.state.queueInfo.id);
            this.setState({ status: 'error' });
        }
    }

    public componentWillUnmount() {
        console.log(`Widget ${this.props.id} componentWillUnmount`);
        dequeueWidget(this.state.queueInfo.id);
        if (this.state.widget) this.props.view.ui.remove(this.state.widget);
    }

    public render() {
        console.log(`Widget ${this.props.id} render`);
        return null;
    }
}

interface DOMWidgetState<T extends GenericWidgetConstructorKeys> {
    domId: string;
    widget?: ConstructorInstance<EsriTypeMap[T]>;
}

class DOMWidget<T extends GenericWidgetConstructorKeys> extends React.Component<DOMWidgetProperties<T> & { specialProps: SpecializedWidgetProperties<T> }, DOMWidgetState<T>> {
    public constructor(props: DOMWidgetProperties<T> & { specialProps: SpecializedWidgetProperties<T> }) {
        super(props);

        this.state = { domId: props.domId || uuidv4() };
        console.log(`Widget ${this.props.id} constructor`);
    }

    public shouldComponentUpdate() { return false; }

    public async componentDidMount() {
        console.log(`Widget ${this.props.id} componentDidMount`);
        try {
            const mapData = await mapSpy.getMap(this.props.mapId);
            if (!mapData) throw new Error(`Couldn't find map ${this.props.mapId}`);
            
            const props = { ...this.props, ...this.props.specialProps, ...mapData, domId: this.state.domId } as unknown as DOMWidgetProperties<T> & MapChild;
            const widget = await loadWidget<T>(props) as ConstructorInstance<EsriTypeMap[T]>;
            this.setState({ widget });
            if (this.props.init) this.props.init(widget);
        } catch (e) {
            console.error(e);
        }
    }

    public componentWillUnmount() {
        console.log(`Widget ${this.props.id} componentWillUnmount`);
    }

    public render() {
        console.log(`Widget ${this.props.id} render`);
        return <DOMWidgetContainer domId={this.state.domId} className={this.props.className} style={this.props.style} />;
    }
}

class DOMWidgetContainer extends React.Component<{ domId: string, className?: string, style?: React.CSSProperties, children?: JSX.Element }> {
    public shouldComponentUpdate() {
        return false;
    }

    public render() {
        return <div id={this.props.domId} className={this.props.className} style={this.props.style}>{this.props.children}</div>;
    }
}

interface ExpandableHTMLProperties {
    children?: JSX.Element;// | string | HTMLElement;
    position?: __esri.UIAddComponent['position'];
    expandProperties?: Optional<Remove<__esri.ExpandProperties, 'content' | 'view'>>;
}

interface ExpandableHTMLState {
    domId: string;
    expand?: __esri.Expand;
    id: string;
}

// TODO: Integrate this with HTML below
export class ExpandableHTML extends React.Component<ExpandableHTMLProperties, ExpandableHTMLState> {
    public constructor(props: ExpandableHTMLProperties) {
        super(props);
        this.state = { domId: uuidv4(), id: '' };
    }

    public shouldComponentUpdate() { return false; }
    public async componentDidMount() {
        const props = this.props as ExpandableHTMLProperties & MapChild;
        const { id, onReady } = queueWidget(props.view, () => this.state.expand!, props.position);
        try {
            const [Expand] = await loadTypedModules('esri/widgets/Expand');
            const expand = new Expand({
                content: document.getElementById(this.state.domId) || undefined,
                ...this.props.expandProperties
            });
            onReady();

            this.setState({ expand, id });
        } catch(e) {
            dequeueWidget(id);
            console.error(e);
        }
    }

    public componentWillUnmount() {
        const props = this.props as ExpandableHTMLProperties & MapChild;
        dequeueWidget(this.state.id);
        if (this.state.expand) props.view.ui.remove(this.state.expand);
    }

    public render() {
        return <DOMWidgetContainer domId={this.state.domId}>{this.props.children}</DOMWidgetContainer>
    }
}

interface HTMLProperties {
    children: JSX.Element | string | HTMLElement;
    position?: __esri.UIAddComponent['position'];
}

export function HTML(incompleteProps: HTMLProperties) {
    console.log('HTML entry');
    const props = incompleteProps as HTMLProperties & MapChild;
    React.useEffect(() => {
        console.log('HTML useEffect');
        let content = props.children;

        if (typeof content !== 'string' && !(content instanceof HTMLElement)) {
            content = renderToStaticMarkup(content);
        }

        if (typeof content === 'string') {
            const dummy = document.createElement('div');
            dummy.innerHTML = content;
            content = dummy.children[0] as HTMLElement;
        }
        
        const { id, onReady } = queueWidget(props.view, () => content as HTMLElement, props.position);
        onReady();

        return function cleanup() {
            console.log('HTML cleanup');
            dequeueWidget(id);
            props.view.ui.remove(content as HTMLElement);
        }
    });

    return null;
}