import { Centrum } from '../../../lib/Centrum';
declare enum MSG_CODES {
    CONNECT = 0,
    DISCONNECT = 1,
    SEND_QUEUED = 2,
    SEND_BACK = 3,
    BROADCAST_ALL_BACK = 4,
    CONNECTION_CHANGE = 5,
    BROADCAST_MIRROR_FRONTS = 6,
    BROADCAST_ALL_FRONTS = 7,
    SEND_FRONT = 8,
    SET_STATE = 9,
    PATCH_STATE = 10
}
export declare type PublishProtocol = any;
export declare type PushProtocol = any;
export declare type SubscribeProtocol = any;
export declare type PullProtocol = any;
/**
 * helper class with functions to make sure protocol codes stay synchronized between front and back channels.
 */
export declare class Protocol {
    constructor();
    static CONNECT(): string;
    static DISCONNECT(): string;
    static BROADCAST_ALL_BACK(): string;
    static SEND_QUEUED(frontUid: any): string;
    static SEND_BACK(backChannelId: any): string;
    static BROADCAST_MIRROR_FRONTS(frontChannelId: any): string;
    static SET_STATE(frontChannelId: any): string;
    static PATCH_STATE(frontChannelId: any): string;
    static BROADCAST_ALL_FRONTS(): string;
    static CONNECTION_CHANGE(frontUid: any): string;
    static SEND_FRONT(frontUid: any): string;
    /**
     * returns concatenated protocol code if id is provided
     * @param code - unique code for different pub/sub types
     * @param id - if pub/sub message is unique between channels it needs an id so messages dont get leaked to other channels that don't need them.
     * @returns {string}
     */
    static make(code: MSG_CODES, id?: string): string;
}
/**
 * Class that implements logic to create needed message functions for a channel.
 * It uses a channel instance when creating said functions, so theres no need
 * to keep track of passing in parameters when wanting to register/unregister/call
 * a message since the factory keeps all of that in its scope when instantiated.
 */
export declare abstract class MessageFactory {
    abstract CONNECT: PublishProtocol | SubscribeProtocol;
    abstract SEND_QUEUED: PublishProtocol | SubscribeProtocol;
    abstract BROADCAST_ALL_BACK: PublishProtocol | SubscribeProtocol;
    abstract SEND_BACK: PushProtocol | SubscribeProtocol;
    abstract DISCONNECT: PushProtocol | SubscribeProtocol;
    abstract CONNECTION_CHANGE: PushProtocol | SubscribeProtocol;
    abstract BROADCAST_MIRROR_FRONTS: PublishProtocol | SubscribeProtocol;
    abstract BROADCAST_ALL_FRONTS: PublishProtocol | SubscribeProtocol;
    abstract SEND_FRONT: PublishProtocol | SubscribeProtocol;
    abstract SET_STATE: PublishProtocol | SubscribeProtocol;
    abstract PATCH_STATE: PublishProtocol | SubscribeProtocol;
    protected centrum: Centrum;
    protected channel: any;
    readonly channelId: string;
    constructor(centrum: any, channel: any);
    protected pubCreator(protocol: any): any;
    /**
     * push will use the same centrum publisher so any registered subs will receive it but since the recipients
     * can change dynamically we want to be able to just give a 'to' parameter to create push and have the protocol
     * factory create the message name for us.
     * @param protocolFactory - Function used to create the publisher name based on the to parameter passed in.
     */
    protected pushCreator(protocolFactory: Function): any;
    /**
     * used for subscriptions with multiple handlers. (multiple channels listening for the same broadcast)
     * @param protocol
     * @param id
     * @returns {any}
     */
    protected subCreator(protocol: any, id: any): any;
    /**
     * used for subscriptions with only one handler. (single handler listening for unique broadcast)
     * @param protocol
     * @returns {any}
     */
    protected pullCreator(protocolFactory: Function): any;
}
export {};
