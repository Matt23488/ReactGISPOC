import { WidgetQueueItem } from './WidgetTypes';
import { v4 as uuidv4 } from 'uuid';

// Because the widgets load asynchronously, it's unpredictable when view.ui.add() gets called normally.
// This solves that problem by adding the widgets to a queue as they are initialized by React,
// and once they have all finished loading, THEN we add them to the UI in the order they
// are initialized by React. This makes it possible to control their locations by how
// you order them as components inside of a map.
const widgetQueue: WidgetQueueItem[] = [];
export function queueWidget(view: __esri.View, getWidget: () => __esri.Widget | HTMLElement | string, position: __esri.UIAddComponent['position']) {
    let cancelled = false;
    const id = uuidv4();
    const record = { id, view, getWidget, position, ready: false, cancel: () => cancelled = true };
    widgetQueue.push(record);
    return {
        id,
        onReady: () => {
            if (cancelled) return;

            record.ready = true;
            if (widgetQueue.every(t => t.ready)) {
                widgetQueue.forEach(t => t.view.ui.add(t.getWidget(), t.position));
                widgetQueue.splice(0, widgetQueue.length);
            }
        }
    };
}

export function dequeueWidget(id: string) {
    const index = widgetQueue.findIndex(item => item.id === id);
    if (index === -1) return false;

    widgetQueue[index].cancel();
    widgetQueue.splice(index, 1);

    return true;
}