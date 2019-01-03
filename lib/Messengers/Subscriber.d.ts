import { Handler } from '../Centrum';
export declare class Subscriber {
    private subSocket;
    private onPublicationHandlers;
    constructor(subSocket: any);
    /**
     * Used when adding a handler for incoming requests.
     * @param name - name of the request
     * @param handler - function used to process data
     */
    addHandler(name: any, handler: Handler): void;
    removeAllHandlers(name: any): void;
    /**
     * removes handler of a subscription at certain index
     * returns how many handlers are left for subscription.
     * @param name
     * @param index
     * @returns {number}
     */
    removeHandler(name: any, index: any): number;
    private registerOnPublicationHandlers;
}
