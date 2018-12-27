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
    removeHandler(name: any): void;
    private registerOnPublicationHandlers;
}
