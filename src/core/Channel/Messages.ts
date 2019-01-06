import { Centrum } from '../../../lib/Centrum';

enum MSG_CODES {
    // FRONT -> BACK
    CONNECT,
    DISCONNECT,
    SEND_QUEUED,
    SEND_BACK,
    BROADCAST_ALL_BACK,

    // BACK -> FRONT
    CONNECT_SUCCESS,
    CONNECT_FAILED,
    BROADCAST_MIRROR_FRONTS,
    BROADCAST_ALL_FRONTS,
    SEND_FRONT,
    SET_STATE,
    PATCH_STATE,
};

export type PublishProtocol = any;
export type PushProtocol = any;
export type SubscribeProtocol = any;
export type PullProtocol = any;

type SubscriptionHandler = (...any) => void;

/**
 * helper class with functions to make sure protocol codes stay synchronized between front and back channels.
 */
export class Protocol {
    constructor(){};

    // FRONT -> BACKS
    static CONNECT() : string  { return Protocol.make(MSG_CODES.CONNECT) };
    static BROADCAST_ALL_BACK() : string  { return Protocol.make(MSG_CODES.BROADCAST_ALL_BACK) };
    static SEND_QUEUED(frontUid) : string  { return Protocol.make(MSG_CODES.SEND_QUEUED, frontUid) };

    // FRONT -> BACK
    static DISCONNECT(backChannelId) : string  { return Protocol.make(MSG_CODES.DISCONNECT, backChannelId) };
    static SEND_BACK(backChannelId) : string  { return Protocol.make(MSG_CODES.SEND_BACK, backChannelId) };

    // BACK -> FRONTS
    static BROADCAST_MIRROR_FRONTS(frontChannelId) : string  { return Protocol.make(MSG_CODES.BROADCAST_MIRROR_FRONTS, frontChannelId) };
    static SET_STATE(frontChannelId): string  { return Protocol.make(MSG_CODES.SET_STATE, frontChannelId) };
    static PATCH_STATE(frontChannelId) : string  { return Protocol.make(MSG_CODES.PATCH_STATE, frontChannelId) };
    static BROADCAST_ALL_FRONTS() : string  { return Protocol.make(MSG_CODES.BROADCAST_ALL_FRONTS) };

    // BACK -> FRONT
    static CONNECT_SUCCESS(frontUid) : string { return Protocol.make(MSG_CODES.CONNECT_SUCCESS, frontUid) };
    static CONNECT_FAILED(frontUid) : string { return Protocol.make(MSG_CODES.CONNECT_FAILED, frontUid) };
    static SEND_FRONT(frontUid) : string  { return Protocol.make(MSG_CODES.SEND_FRONT, frontUid) };
    /**
     * returns concatenated protocol code if id is provided
     * @param code - unique code for different pub/sub types
     * @param id - if pub/sub message is unique between channels it needs an id so messages dont get leaked to other channels that don't need them.
     * @returns {string}
     */
    static make(code: MSG_CODES, id?: string) : string {
        return id ? `${code.toString()}-${id}` : code.toString();
    }
}

/**
 * helper class with functions to make sure protocol codes stay synchronized between front and back channels.
 */
export abstract class ChannelMessages {
    // FRONT -> BACKS
    public abstract CONNECT: PublishProtocol | SubscribeProtocol;
    public abstract SEND_QUEUED: PublishProtocol | SubscribeProtocol;
    public abstract BROADCAST_ALL_BACK: PublishProtocol | SubscribeProtocol;

    // FONT -> BACK
    public abstract SEND_BACK: PushProtocol | SubscribeProtocol;
    public abstract DISCONNECT: PushProtocol | SubscribeProtocol;


    // BACK -> FRONT
    public abstract CONNECT_SUCCESS: PublishProtocol | SubscribeProtocol;
    public abstract CONNECT_FAILED: PublishProtocol | SubscribeProtocol;
    public abstract BROADCAST_MIRROR_FRONTS: PublishProtocol | SubscribeProtocol;
    public abstract BROADCAST_ALL_FRONTS: PublishProtocol | SubscribeProtocol;
    public abstract SEND_FRONT: PublishProtocol | SubscribeProtocol;
    public abstract SET_STATE: PublishProtocol | SubscribeProtocol;
    public abstract PATCH_STATE: PublishProtocol | SubscribeProtocol;

    protected centrum: Centrum;
    protected channel: any;
    readonly channelId: string;

    constructor(centrum, channel) {
        this.channelId = channel.channelId;
        this.channel = channel;
        this.centrum = centrum;
    }

    protected pubCreator(protocol) {
        let pub: any = {};
        pub = (function (...args) {
            if (pub.publisher) {
                pub.publisher(...args);
            } else {
                throw new Error('Unitialized');
            }
        });
        pub.register = () => {
            pub.publisher = this.centrum.getOrCreatePublish(protocol);

            pub.unregister = (...args) => {
                this.centrum.removePublish(protocol);
            };
        };
        return pub;
    }

    /**
     * push will use the same centrum publisher but since the recipients can change dynamically we want to be able to
     * just give a 'to' parameter to create push and have the protocol factory create the message name for us.
     * @param protocolFactory - Function used to create the publisher name based on the to parameter passed in.
     */
    protected pushCreator(protocolFactory: Function) {
        let push: any = {};
        push = (function (to, ...args) {
            if (push[to]) {
                push[to](to, ...args);
            } else {
                throw new Error('Unitialized');
            }
        });
        push.register = (to, ...args) => {
            push[to] = this.centrum.getOrCreatePublish(protocolFactory(to), ...args);

            push.unregister = () => {
                this.centrum.removePublish(protocolFactory(to));
                delete push[to];
            };
        };
        return push;
    }

    /**
     * used for subscriptions with multiple handlers. (multiple channels listening for the same broadcast)
     * @param protocol
     * @param id
     * @returns {any}
     */
    protected subCreator(protocol, id) {
        let sub: any = {};

        sub.register = (onSubscriptionHandler: SubscriptionHandler) => {
            sub.subscriber = this.centrum.createOrAddSubscription(protocol, id, onSubscriptionHandler);
            sub.unregister = () => {
                this.centrum.removeSubscriptionById(protocol, id);
            };
        };

        return sub;
    }

    /**
     * used for subscriptions with multiple handlers. (single channel listening for unique broadcast)
     * @param protocol
     * @returns {any}
     */
    protected pullCreator(protocol) {
        let pull: any = {};

        pull.register = (onSubscriptionHandler: SubscriptionHandler) => {
            if(!(this.centrum.subscriptions[protocol])) {
                pull.subscriber = this.centrum.createSubscription(protocol, protocol, onSubscriptionHandler)
            }
            pull.unregister = () => {
                this.centrum.removeAllSubscriptionsWithName(protocol);
            };
        };
        return pull;
    }
}