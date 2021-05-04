import { v4 as uuidv4 } from 'uuid';

interface TopicSubscription {
    id: string;
    name: string;
    callback: (data: any) => void;
}
const _subscriptionMap = new Map<string, TopicSubscription>();
export const topic = {
    publish: <T>(name: string, data?: T) => {
        for (let subscription of _subscriptionMap.values()) {
            if (subscription.name !== name) continue;

            subscription.callback(data);
        }
    },

    subscribe: <T>(name: string, callback: (data: T) => void) => {
        const id = uuidv4();
        const subscription = { id, name, callback };
        _subscriptionMap.set(id, subscription);
        return id;
    },

    unsubscribe: (topicId: string) => {
        return _subscriptionMap.delete(topicId);
    }
};