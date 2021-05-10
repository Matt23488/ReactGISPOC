import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MapContext } from '../Map';
import DOMContainer from '../utilities/DomContainer';
import { loadTypedModules } from '../utilities/GIS';
import { loadWidget } from './WidgetInitialization';
import { queueWidget, dequeueWidget } from './WidgetQueue';
import { GenericWidgetConstructorKeys, MapComponentProperties, MapComponentState, WidgetProperties, WidgetState } from './WidgetTypes';

import './Widgets.css';


export class Widget<T extends GenericWidgetConstructorKeys> extends React.Component<WidgetProperties<T>, WidgetState<T>> {
    static contextType = MapContext;

    public constructor(props: WidgetProperties<T>) {
        super(props);
        this.state = { domId: uuidv4() };
    }

    public shouldComponentUpdate() { return false; }

    public async componentDidMount() {
        console.log(`Widget ${this.props.id || this.props.type} componentDidMount`);
        try {
            const widget = await loadWidget<T>(this.props as WidgetProperties<T>, this.context, this.state.domId);
            this.setState({ widget });
            if (this.props.init) this.props.init(widget);
        } catch (e) {
            console.error(e);
        }
    }

    public render() {
        return <DOMContainer domId={this.state.domId} />;
    }
}

export class MapComponent extends React.Component<MapComponentProperties, MapComponentState> {
    static contextType = MapContext;

    public constructor(props: MapComponentProperties) {
        super(props);

        this.state = { domId: uuidv4(), id: '' };
    }

    public shouldComponentUpdate() { return false; }
    public async componentDidMount() {
        console.log(`MapComponent ${this.state.domId} componentDidMount`);
        let viewTarget: MapComponentState['viewTarget'];
        const { id, onReady } = queueWidget(this.context.view, () => viewTarget!, this.props.position);
        try {
            if (this.props.expandable) {
                const [Expand] = await loadTypedModules('esri/widgets/Expand');
                viewTarget = new Expand({
                    content: document.getElementById(this.state.domId) || undefined,
                    ...this.props.expandProperties
                });
            } else viewTarget = document.getElementById(this.state.domId) || undefined;
            this.setState({ viewTarget });
            onReady();

        } catch(e) {
            dequeueWidget(id);
            console.error(e);
        }
    }

    public componentWillUnmount() {
        console.log(`MapComponent ${this.state.domId} componentWillUnmount`);
        dequeueWidget(this.state.id);
        if (this.state.viewTarget) this.context.view.ui.remove(this.state.viewTarget);
    }

    public render() {
        console.log(`MapComponent ${this.state.domId} render`);
        return (
            <DOMContainer domId={this.state.domId} className={this.props.className} style={this.props.style}>
                {this.props.children}
            </DOMContainer>
        );
    }
}