import { SERIALIZER_TYPES } from '../Serializers';
export declare type Hook = (...args: any[]) => any;
export declare type Handler<T> = (data: any) => void;
export interface SubscriptionHandler {
    (data: any): Handler<Function>;
    id: string;
    decode?: Function;
}
export declare type Sequence = number;
export interface REQUEST_MESSAGE {
    readonly name: string;
    readonly from: string;
    readonly sequence: number;
    data: any;
}
export interface RESPONSE_MESSAGE {
    readonly sequence: number;
    data: any;
}
export interface MessengerConfig {
    'broker': {
        ['URI']: string;
    };
    ['servers']: Array<{
        ['name']: string;
        ['messengerOptions']: any;
    }>;
}
export interface RequestOptions {
    timeout?: number;
}
export interface PublishOptions {
    pubSocketURI: string;
}
export interface SubscribeOptions {
    pubSocketURIs: Array<string>;
}
export interface MessengerOptions {
    id: string;
    brokerURI?: string;
    request?: RequestOptions;
    response?: boolean;
    publish?: PublishOptions;
    subscribe?: SubscribeOptions;
}
declare enum CREATED_OR_ADDED {
    CREATED = "CREATED",
    ADDED = "ADDED"
}
import { Requester } from './Messengers/Requester';
export declare class Messenger {
    serverId: string;
    requests?: {
        [name: string]: Function;
    };
    responses?: Set<string>;
    subscriptions?: Set<string>;
    publish?: {
        [name: string]: Function;
    };
    requester?: Requester;
    responder?: any;
    notifier?: any;
    subscriber?: any;
    publisher?: any;
    private dealerSocket;
    private pubSocket;
    private subSocket;
    private options;
    constructor(options: MessengerOptions);
    /**
     * sets and initializes available public functions based on messenger options passed in.
     * @param options
     */
    private initializeMessengers;
    close(): void;
    /**
     * If options.request was passed into constructor, you can use this function to create
     * and send requests. After running this you can make your request by Messenger.requests.name() in which
     * the name() function is the beforeRequestHook passed in.
     * @param name - unique name of request which will be used
     * @param to - id of server you are sending request to.
     * @param beforeHook - Hook that's used if you want to process data before sending it,
     * @returns Function - request function that sends out the request.
     * if left out, by default you can pass in an object when calling request and send that.
     * whatever it returns gets sent.
     */
    createRequest(name: string, to: string, beforeHook?: Hook): Function;
    removeRequest(name: any): void;
    /**
     * If options.response was passed into constructor, you can use this function to create
     * an onRequest handler, with a hook that processes the request data and whatever
     * the hook returns gets sent back as the response data.
     * @param name - unique name of request which will be used
     * @param onRequestHook - Hook to process data from request, whatever it returns gets sent back
     */
    createResponse(name: string, beforeHook: Hook): void;
    removeResponse(name: any): void;
    /**
     *
     * @param name - name for publish method
     * @param beforeHook - hook that sends return value as message
     * @param afterHandler - hook used for cleanup after publishing a method, gets message sent as param.
     * @param serializer - enum value that tells the publisher how to encode your message, look at SERIALIZER_TYPES for more info
     */
    createPublish(name: string, beforeHook?: Hook, serializer?: SERIALIZER_TYPES): Function;
    /**
     * does same thing as createPublish but if the publish name already exists it will return the handler.
     * @param name - name for publish method
     * @param beforeHook - hook that sends return value as message
     * @param afterHandler - hook used for cleanup after publishing a method, gets message sent as param.
     * @param serializer - enum value that tells the publisher how to encode your message, look at SERIALIZER_TYPES for more info
     */
    getOrCreatePublish(name: string, beforeHook?: Hook, serializer?: SERIALIZER_TYPES): Function;
    removePublish(name: any): void;
    removeAllPublish(): void;
    /**
     * creates a new subscription and subscription handler to process data when receiving a publication. Throws error if handler already exists.
     * @param name - name of publication to subscribe to.
     * @param id - identifier for handler to run on publication
     * @param handler - method that takes in publication data as parameter when received.
     * @param serializer - enum value that tells the subscriber how to decode incoming message, look at SERIALIZER_TYPES for more info
     * @returns boolean - returns true if it was successful.
     */
    createSubscription(name: string, id: string, handler: Handler<Function>, serializer?: SERIALIZER_TYPES): boolean;
    /**
     * creates a new subscription if it doesnt exist but if it does, instead of throwing an error it will add a new handler to be ran on the publication
     * @param name - name of publication to subscribe to.
     * @param id - identifier for handler to run on publication
     * @param handler - method that takes in publication data as parameter when received.
     * @param serializer - enum value that tells the subscriber how to decode incoming message, look at SERIALIZER_TYPES for more info
     * @returns CREATED_OR_ADDED - enum value to signify if you created new subscription or added new handler to existing subscription.
     */
    createOrAddSubscription(name: string, id: string, handler: Handler<Function>, serializer?: SERIALIZER_TYPES): CREATED_OR_ADDED;
    /**
     * removes specific subscription by id
     * @param id - id of subscription that gets returned on creation.
     * @param name - name of subscription that gets returned on creation.
     * @returns - number of subscriptions removed.
     */
    removeSubscriptionById(id: string, name: string): number;
    /**
     * removes all handlers for all subscriptions that have the given id.
     * @param id - id used to identify handlers for different subscription names.
     * @returns number - ammount of handlers removed.
     */
    removeAllSubscriptionsWithId(id: string): number;
    removeAllSubscriptionsWithName(name: string): void;
    removeAllSubscriptions(): void;
    /**
     * returns all ids that have a handler registered for name.
     * @param name
     * @returns array
     */
    getHandlerIdsForSubscriptionName(name: string): void;
    /**
     * returns all subscription names that a handler id is waiting for.
     * @param id
     * @returns array
     */
    getSubscriptionNamesForHandlerId(id: string): void;
    private _createSubscription;
    private _createOrAddSubscription;
    private _removeSubscriptionById;
    private _removeAllSubscriptionsWithId;
    private _removeAllSubscriptionsWithName;
    private _removeAllSubscriptions;
    private _getHandlerIdsForSubscriptionName;
    private _getSubscriptionNamesForHandlerId;
    private _createPublish;
    private _getOrCreatePublish;
    private _removePublish;
    private _removeAllPublish;
    private _createRequest;
    private _removeRequest;
    private _createResponse;
    private _removeResponse;
}
export {};
