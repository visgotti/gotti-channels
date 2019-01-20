import { Messenger } from 'gotti-pubsub/dist/Messenger';
declare enum MSG_CODES {
    SEND_QUEUED = 0,
    PATCH_STATE = 1,
    MESSAGE_CLIENT = 2,
    CONNECT = 3,
    DISCONNECT = 4,
    SEND_BACK = 5,
    BROADCAST_ALL_BACK = 6,
    LINK = 7,
    UNLINK = 8,
    ADD_CLIENT_WRITE = 9,
    REMOVE_CLIENT_WRITE = 10,
    ACCEPT_LINK = 11,
    CONNECTION_CHANGE = 12,
    BROADCAST_LINKED_FRONTS = 13,
    BROADCAST_ALL_FRONTS = 14,
    SEND_FRONT = 15
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
    static SEND_QUEUED(backMasterIndex: any): string;
    static DISCONNECT(): string;
    static PATCH_STATE(frontMasterIndex: any): string;
    static MESSAGE_CLIENT(frontMasterIndex: any): string;
    static CONNECT(): string;
    static BROADCAST_ALL_BACK(): string;
    static SEND_BACK(backChannelId: any): string;
    static LINK(frontUid: any): string;
    static UNLINK(frontUid: any): string;
    static ADD_CLIENT_WRITE(frontUid: any): string;
    static REMOVE_CLIENT_WRITE(frontUid: any): string;
    static BROADCAST_LINKED_FRONTS(frontChannelId: any): string;
    static BROADCAST_ALL_FRONTS(): string;
    static CONNECTION_CHANGE(frontUid: any): string;
    static SEND_FRONT(frontUid: any): string;
    static ACCEPT_LINK(frontUid: any): string;
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
declare abstract class MessageFactory {
    protected messenger: Messenger;
    constructor(messenger: any);
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
    protected pullCreator(protocolFactory: Function, decoder?: any): any;
}
export declare abstract class ChannelMessageFactory extends MessageFactory {
    abstract CONNECT: PublishProtocol | SubscribeProtocol;
    abstract BROADCAST_ALL_BACK: PublishProtocol | SubscribeProtocol;
    abstract SEND_BACK: PushProtocol | SubscribeProtocol;
    abstract LINK: PublishProtocol | PullProtocol;
    abstract UNLINK: PublishProtocol | PullProtocol;
    abstract ADD_CLIENT_WRITE: PublishProtocol | PullProtocol;
    abstract REMOVE_CLIENT_WRITE: PublishProtocol | PullProtocol;
    abstract CONNECTION_CHANGE: PushProtocol | SubscribeProtocol;
    abstract BROADCAST_LINKED_FRONTS: PublishProtocol | SubscribeProtocol;
    abstract BROADCAST_ALL_FRONTS: PublishProtocol | SubscribeProtocol;
    abstract SEND_FRONT: PublishProtocol | SubscribeProtocol;
    abstract ACCEPT_LINK: PublishProtocol | SubscribeProtocol;
    constructor(messenger: any);
}
export declare abstract class MasterMessageFactory extends MessageFactory {
    abstract SEND_QUEUED: PushProtocol | PullProtocol;
    abstract PATCH_STATE: PushProtocol | PullProtocol;
    abstract MESSAGE_CLIENT: PushProtocol | SubscribeProtocol;
    constructor(messenger: any);
}
export {};
