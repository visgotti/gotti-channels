import { SubscriptionHandler } from '../Messenger';
export declare class Subscriber {
    private subSocket;
    private handlersByName;
    private handlerIdToNames;
    private idsAssigned;
    constructor(subSocket: any);
    addHandler(name: string, id: string, handler: SubscriptionHandler, decode?: Function): {
        success: boolean;
        error?: string;
    };
    /**
     * Removes all handlers with name
     * @param name
     */
    removeAllHandlersWithName(name: any): void;
    /**
     * removes handler of a subscription by id and name
     * @param id - id of handler.
     * @param name - name of subscription to remove handler for
     * @returns { success: boolean, handlersLeft: number } data about removed handler.
     */
    removeHandlerById(id: string, name: string): {
        success: boolean;
        name?: string;
        handlersLeft?: number;
    };
    /**
     * removes all handlers for all subscriptions that have the given id.
     * @param id - id used to identify handlers for different subscription names.
     * @returns number - ammount of handlers removed.
     */
    removeAllHandlersWithId(id: string): number;
    getSubscriptionNamesWithId(id: string): Array<string>;
    getHandlerIdsForName(name: string): Array<string>;
    private registerOnPublicationHandlers;
}
