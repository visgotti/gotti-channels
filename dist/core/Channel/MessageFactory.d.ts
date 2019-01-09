import { Messenger } from '../../../lib/core/Messenger';
declare enum MSG_CODES {
    CONNECT = 0,
    DISCONNECT = 1,
    SEND_QUEUED = 2,
    SEND_BACK = 3,
    BROADCAST_ALL_BACK = 4,
    LINK = 5,
    UNLINK = 6,
    CONNECTION_CHANGE = 7,
    BROADCAST_LINKED_FRONTS = 8,
    BROADCAST_ALL_FRONTS = 9,
    SEND_FRONT = 10,
    SET_STATE = 11,
    PATCH_STATE = 12
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
    static LINK(frontUid: any): string;
    static UNLINK(frontUid: any): string;
    static BROADCAST_LINKED_FRONTS(frontChannelId: any): string;
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
    abstract BROADCAST_ALL_BACK: PublishProtocol | SubscribeProtocol;
    abstract SEND_BACK: PushProtocol | SubscribeProtocol;
    abstract DISCONNECT: PushProtocol | SubscribeProtocol;
    abstract SEND_QUEUED: PublishProtocol | SubscribeProtocol;
    abstract LINK: PublishProtocol | SubscribeProtocol;
    abstract UNLINK: PublishProtocol | SubscribeProtocol;
    abstract CONNECTION_CHANGE: PushProtocol | SubscribeProtocol;
    abstract BROADCAST_LINKED_FRONTS: PublishProtocol | SubscribeProtocol;
    abstract BROADCAST_ALL_FRONTS: PublishProtocol | SubscribeProtocol;
    abstract SEND_FRONT: PublishProtocol | SubscribeProtocol;
    abstract SET_STATE: PublishProtocol | SubscribeProtocol;
    abstract PATCH_STATE: PublishProtocol | SubscribeProtocol;
    protected messenger: Messenger;
    protected channel: any;
    readonly channelId: string;
    constructor(messenger: any, channel: any);
    protected requestCreator(protocolFactory: any, encoder?: any): void;
    protected responseCreator(protocolFactory: any, encoder?: any): void;
    protected pubCreator(protocol: any, encoder?: any): any;
    /**
     * push will use the same messenger publisher so any registered subs will receive it but since the recipients
     * can change dynamically we want to be able to just give a 'to' parameter to create push and have the protocol
     * factory create the message name for us.
     * @param protocolFactory - Function used to create the publisher name based on the to parameter passed in.
     */
    protected pushCreator(protocolFactory: Function, encoder?: any): any;
    /**
     * used for subscriptions with multiple handlers. (multiple channels listening for the same broadcast)
     * @param protocol
     * @param id
     * @returns {any}
     */
    protected subCreator(protocol: any, id: any, decoder?: any): any;
    /**
     * used for subscriptions with only one handler. (single handler listening for unique broadcast)
     * @param protocol
     * @returns {any}
     */
    protected pullCreator(protocolFactory: Function): any;
}
export {};
