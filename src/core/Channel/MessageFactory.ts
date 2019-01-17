import { Messenger } from 'centrum-messengers/dist/core/Messenger';

enum MSG_CODES {
    // FRONT MASTER -> BACK MASTER
    SEND_QUEUED,

    //BACK MASTER -> FRONT MASTER
    PATCH_STATE,
    MESSAGE_CLIENT,

    // FRONT -> BACK
    CONNECT,
    DISCONNECT,
    SEND_BACK,
    BROADCAST_ALL_BACK,
    LINK,
    UNLINK,
    ADD_CLIENT_WRITE,
    REMOVE_CLIENT_WRITE,

    // BACK -> FRONT
    ACCEPT_LINK,
    CONNECTION_CHANGE,
    BROADCAST_LINKED_FRONTS,
    BROADCAST_ALL_FRONTS,
    SEND_FRONT,
}

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

    //FRONT MASTER -> BACK MASTER
    static SEND_QUEUED(backMasterIndex) : string  { return Protocol.make(MSG_CODES.SEND_QUEUED, backMasterIndex) };
    static DISCONNECT() : string  { return Protocol.make(MSG_CODES.DISCONNECT) }; //todo: figure out all disconnection edge cases before implementing

    //BACK MASTER -> FRONT MASTERS
    static PATCH_STATE(frontMasterIndex) : string  { return Protocol.make(MSG_CODES.PATCH_STATE, frontMasterIndex) };
    static MESSAGE_CLIENT(frontMasterIndex) : string { return Protocol.make(MSG_CODES.MESSAGE_CLIENT, frontMasterIndex ) };

    // FRONT -> BACKS
    static CONNECT() : string  { return Protocol.make(MSG_CODES.CONNECT) };
    static BROADCAST_ALL_BACK() : string  { return Protocol.make(MSG_CODES.BROADCAST_ALL_BACK) };

    static SEND_BACK(backChannelId) : string  { return Protocol.make(MSG_CODES.SEND_BACK, backChannelId) };
    static LINK(frontUid) : string { return Protocol.make(MSG_CODES.LINK, frontUid) };
    static UNLINK(frontUid) : string { return Protocol.make(MSG_CODES.UNLINK, frontUid) };
    static ADD_CLIENT_WRITE(frontUid) : string { return Protocol.make(MSG_CODES.ADD_CLIENT_WRITE, frontUid) };
    static REMOVE_CLIENT_WRITE(frontUid) : string { return Protocol.make(MSG_CODES.REMOVE_CLIENT_WRITE, frontUid) };

    // BACK -> FRONTS
    static BROADCAST_LINKED_FRONTS(frontChannelId) : string  { return Protocol.make(MSG_CODES.BROADCAST_LINKED_FRONTS, frontChannelId) };
    static BROADCAST_ALL_FRONTS() : string  { return Protocol.make(MSG_CODES.BROADCAST_ALL_FRONTS) };

    // BACK -> FRONT
    static CONNECTION_CHANGE(frontUid) : string { return Protocol.make(MSG_CODES.CONNECTION_CHANGE, frontUid) };
    static SEND_FRONT(frontUid) : string  { return Protocol.make(MSG_CODES.SEND_FRONT, frontUid) };
    static ACCEPT_LINK(frontUid): string  { return Protocol.make(MSG_CODES.ACCEPT_LINK, frontUid) };

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
 * Class that implements logic to create needed message functions for a channel.
 * It uses a channel instance when creating said functions, so theres no need
 * to keep track of passing in parameters when wanting to register/unregister/call
 * a message since the factory keeps all of that in its scope when instantiated.
 */
abstract class MessageFactory {
    protected messenger: Messenger;

    constructor(messenger) {
        this.messenger = messenger;
    }

    protected pubCreator(protocol, encoder?) {
        let pub: any = {};

        pub = (function (...args) {
            if (pub.publisher) {
                pub.publisher(...args);
            } else {
                throw new Error('Unitialized');
            }
        });

        pub.register = () => {
            pub.publisher = this.messenger.getOrCreatePublish(protocol, null, encoder);

            pub.unregister = () => {
                this.messenger.removePublish(protocol);
            };
        };

        return pub;
    }

    /**
     * push will use the same messenger publisher so any registered subs will receive it but since the recipients
     * can change dynamically we want to be able to just give a 'to' parameter to create push and have the protocol
     * factory create the message name for us.
     * @param protocolFactory - Function used to create the publisher name based on the to parameter passed in.
     */
    protected pushCreator(protocolFactory: Function, encoder?) {
        let push: any = {};

        push.register = (to) => {
            push[to] = this.messenger.getOrCreatePublish(protocolFactory(to), null, encoder);

            push.unregister = () => {
                this.messenger.removePublish(protocolFactory(to));
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
    protected subCreator(protocol, id, decoder?) {
        let sub: any = {};

        sub.register = (onSubscriptionHandler: SubscriptionHandler) => {
            sub.subscriber = this.messenger.createOrAddSubscription(protocol, id, onSubscriptionHandler, decoder);
            sub.unregister = () => {
                this.messenger.removeSubscriptionById(protocol, id);
            };
        };

        return sub;
    }

    /**
     * used for subscriptions with only one handler. (single handler listening for unique broadcast)
     * @param protocol
     * @returns {any}
     */
    protected pullCreator(protocolFactory: Function, decoder?) {
        let pull: any = {};

        pull.register = (from, onSubscriptionHandler: SubscriptionHandler) => {
            pull.subscriber = this.messenger.createSubscription(protocolFactory(from), protocolFactory(from), onSubscriptionHandler, decoder);
            pull.unregister = () => {
                this.messenger.removeAllSubscriptionsWithName(protocolFactory(from));
            };
        };
        return pull;
    }
}

export abstract class ChannelMessageFactory extends MessageFactory {
    // FRONT -> BACKS
    public abstract CONNECT: PublishProtocol | SubscribeProtocol; //TODO: req/res
    public abstract BROADCAST_ALL_BACK: PublishProtocol | SubscribeProtocol;

    // FRONT -> BACK
    public abstract SEND_BACK: PushProtocol | SubscribeProtocol;
    public abstract LINK: PublishProtocol | PullProtocol;
    public abstract UNLINK: PublishProtocol | PullProtocol;
    public abstract ADD_CLIENT_WRITE: PublishProtocol | PullProtocol;
    public abstract REMOVE_CLIENT_WRITE: PublishProtocol | PullProtocol;

    // BACK -> FRONT
    public abstract CONNECTION_CHANGE: PushProtocol | SubscribeProtocol;
    public abstract BROADCAST_LINKED_FRONTS: PublishProtocol | SubscribeProtocol;
    public abstract BROADCAST_ALL_FRONTS: PublishProtocol | SubscribeProtocol;
    public abstract SEND_FRONT: PublishProtocol | SubscribeProtocol;
    public abstract ACCEPT_LINK: PublishProtocol | SubscribeProtocol;
    constructor(messenger) {
        super(messenger)
    }
}

export abstract class MasterMessageFactory extends MessageFactory {
    public abstract SEND_QUEUED: PushProtocol | PullProtocol;
    public abstract PATCH_STATE: PushProtocol | PullProtocol; //todo switch this to subscribe not pull
    public abstract MESSAGE_CLIENT: PushProtocol | SubscribeProtocol;

    constructor(messenger) {
        super(messenger)
    }
}