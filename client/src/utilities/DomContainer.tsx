import React from 'react';
import { v4 as uuidv4 } from 'uuid';

export default class DOMContainer extends React.Component<DOMContainerProperties> {
    public shouldComponentUpdate() {
        return false;
    }

    public render() {
        return <div id={this.props.domId || uuidv4()} className={this.props.className} style={this.props.style}>{this.props.children}</div>;
    }
}

interface DOMContainerProperties {
    domId?: string;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode | React.ReactNodeArray;
}