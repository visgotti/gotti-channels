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
export type SubscribeProtocol = any;
type SubscriptionHandler = (...any) => void;

/**
 * helper class with functions to make sure protocol codes stay synchronized between front and back channels.
 */
export class Protocol {
    constructor(){};

    // FRONT -> BACK
    static CONNECT() : string  { return Protocol.make(MSG_CODES.CONNECT) };
    static BROADCAST_ALL_BACK() : string  { return Protocol.make(MSG_CODES.BROADCAST_ALL_BACK) };
    static DISCONNECT(backChannelId) : string  { return Protocol.make(MSG_CODES.DISCONNECT, backChannelId) };
    static SEND_BACK(backChannelId) : string  { return Protocol.make(MSG_CODES.SEND_BACK, backChannelId) };
    static SEND_QUEUED(frontUid) : string  { return Protocol.make(MSG_CODES.SEND_QUEUED, frontUid) };

    // BACK -> FRONT
    static CONNECT_SUCCESS(frontUid) : string { return Protocol.make(MSG_CODES.CONNECT_SUCCESS, frontUid) };
    static CONNECT_FAILED(frontUid) : string { return Protocol.make(MSG_CODES.CONNECT_FAILED, frontUid) };
    static SEND_FRONT(frontUid) : string  { return Protocol.make(MSG_CODES.SEND_FRONT, frontUid) };
    static BROADCAST_MIRROR_FRONTS(frontChannelId) : string  { return Protocol.make(MSG_CODES.BROADCAST_MIRROR_FRONTS, frontChannelId) };
    static SET_STATE(frontChannelId): string  { return Protocol.make(MSG_CODES.SET_STATE, frontChannelId) };
    static PATCH_STATE(frontChannelId) : string  { return Protocol.make(MSG_CODES.PATCH_STATE, frontChannelId) };
    static BROADCAST_ALL_FRONTS() : string  { return Protocol.make(MSG_CODES.BROADCAST_ALL_FRONTS) };

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
    // FRONT -> BACK
    public abstract CONNECT: any;
    public abstract DISCONNECT: PublishProtocol | SubscribeProtocol;
    public abstract SEND_QUEUED: PublishProtocol | SubscribeProtocol;
    public abstract SEND_BACK: PublishProtocol | SubscribeProtocol;
    public abstract BROADCAST_ALL_BACK: PublishProtocol | SubscribeProtocol;

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
        pub.createPub = () => {
            pub.publisher = this.centrum.getOrCreatePublish(protocol);

            pub.removePub = (...args) => {
                this.centrum.removePublish(protocol);
            };
        };

        return pub;
    }

    protected multiPubCreator(protocolFactory: Function) {
        let pub: any = {};
        pub = (function (to, ...args) {
            if (pub[to]) {
                pub[to](to, ...args);
            } else {
                throw new Error('Unitialized');
            }
        });
        pub.createMultiPub = (to, ...args) => {
            pub[to] = this.centrum.getOrCreatePublish(protocolFactory(to), ...args);

            pub.removePub = () => {
                this.centrum.removePublish(protocolFactory(to));
                delete pub[to];
            };
        };
        return pub;
    }

    protected subCreator(protocol, id) {
        let sub: any = {};
        sub.createSub = (onSubscriptionHandler: SubscriptionHandler) => {
            sub.subscriber = this.centrum.createOrAddSubscription(protocol, id, onSubscriptionHandler);
            sub.removeSubscribe = () => {
                this.centrum.removeSubscriptionById(protocol, id);
            };
        };
        sub.createSub = (onSubscriptionHandler: SubscriptionHandler) => {
            if(!(this.centrum.subscriptions[protocol])) {
                sub.subscriber = this.centrum.createSubscription(protocol, id, onSubscriptionHandler)
            }
            sub.removeSub = () => {
                this.centrum.removeSubscriptionById(protocol, id);
            };
        };

        return sub;
    }
}