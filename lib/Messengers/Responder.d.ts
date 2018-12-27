import { Hook } from '../Centrum';
export declare class Responder {
    private dealerSocket;
    private onRequestHooks;
    constructor(dealerSocket: any);
    /**
     * Used when adding a handler for incoming requests.
     * @param name - name of the request
     * @param hook - function used to process and return data
     */
    addOnRequestHook(name: any, hook: Hook): void;
    removeOnRequestHook(name: any): boolean;
    /**
     * @param response - response message to encode and send
     * @param toServerId - id of the server waiting for response
     */
    private sendResponse;
    private registerOnRequestHooks;
}
