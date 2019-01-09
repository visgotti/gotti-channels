"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MSG_CODES;
(function (MSG_CODES) {
    // FRONT -> BACK
    MSG_CODES[MSG_CODES["CONNECT"] = 0] = "CONNECT";
    MSG_CODES[MSG_CODES["DISCONNECT"] = 1] = "DISCONNECT";
    MSG_CODES[MSG_CODES["SEND_QUEUED"] = 2] = "SEND_QUEUED";
    MSG_CODES[MSG_CODES["SEND_BACK"] = 3] = "SEND_BACK";
    MSG_CODES[MSG_CODES["BROADCAST_ALL_BACK"] = 4] = "BROADCAST_ALL_BACK";
    MSG_CODES[MSG_CODES["LINK"] = 5] = "LINK";
    MSG_CODES[MSG_CODES["UNLINK"] = 6] = "UNLINK";
    // BACK -> FRONT
    MSG_CODES[MSG_CODES["CONNECTION_CHANGE"] = 7] = "CONNECTION_CHANGE";
    MSG_CODES[MSG_CODES["BROADCAST_LINKED_FRONTS"] = 8] = "BROADCAST_LINKED_FRONTS";
    MSG_CODES[MSG_CODES["BROADCAST_ALL_FRONTS"] = 9] = "BROADCAST_ALL_FRONTS";
    MSG_CODES[MSG_CODES["SEND_FRONT"] = 10] = "SEND_FRONT";
    MSG_CODES[MSG_CODES["SET_STATE"] = 11] = "SET_STATE";
    MSG_CODES[MSG_CODES["PATCH_STATE"] = 12] = "PATCH_STATE";
})(MSG_CODES || (MSG_CODES = {}));
/**
 * helper class with functions to make sure protocol codes stay synchronized between front and back channels.
 */
class Protocol {
    constructor() { }
    ;
    // FRONT -> BACKS
    static CONNECT() { return Protocol.make(MSG_CODES.CONNECT); }
    ;
    static DISCONNECT() { return Protocol.make(MSG_CODES.DISCONNECT); }
    ;
    static BROADCAST_ALL_BACK() { return Protocol.make(MSG_CODES.BROADCAST_ALL_BACK); }
    ;
    static SEND_QUEUED(frontUid) { return Protocol.make(MSG_CODES.SEND_QUEUED, frontUid); }
    ;
    static SEND_BACK(backChannelId) { return Protocol.make(MSG_CODES.SEND_BACK, backChannelId); }
    ;
    static LINK(frontUid) { return Protocol.make(MSG_CODES.LINK, frontUid); }
    ;
    static UNLINK(frontUid) { return Protocol.make(MSG_CODES.UNLINK, frontUid); }
    ;
    // BACK -> FRONTS
    static BROADCAST_LINKED_FRONTS(frontChannelId) { return Protocol.make(MSG_CODES.BROADCAST_LINKED_FRONTS, frontChannelId); }
    ;
    static SET_STATE(frontChannelId) { return Protocol.make(MSG_CODES.SET_STATE, frontChannelId); }
    ;
    static PATCH_STATE(frontChannelId) { return Protocol.make(MSG_CODES.PATCH_STATE, frontChannelId); }
    ;
    static BROADCAST_ALL_FRONTS() { return Protocol.make(MSG_CODES.BROADCAST_ALL_FRONTS); }
    ;
    // BACK -> FRONT
    static CONNECTION_CHANGE(frontUid) { return Protocol.make(MSG_CODES.CONNECTION_CHANGE, frontUid); }
    ;
    static SEND_FRONT(frontUid) { return Protocol.make(MSG_CODES.SEND_FRONT, frontUid); }
    ;
    /**
     * returns concatenated protocol code if id is provided
     * @param code - unique code for different pub/sub types
     * @param id - if pub/sub message is unique between channels it needs an id so messages dont get leaked to other channels that don't need them.
     * @returns {string}
     */
    static make(code, id) {
        return id ? `${code.toString()}-${id}` : code.toString();
    }
}
exports.Protocol = Protocol;
/**
 * Class that implements logic to create needed message functions for a channel.
 * It uses a channel instance when creating said functions, so theres no need
 * to keep track of passing in parameters when wanting to register/unregister/call
 * a message since the factory keeps all of that in its scope when instantiated.
 */
class MessageFactory {
    constructor(messenger, channel) {
        this.channelId = channel.channelId;
        this.channel = channel;
        this.messenger = messenger;
    }
    //TODO: even though were using pub/sub zmq sockets it would make some of the code much more legible if I can set up a nice req/res message layer.
    requestCreator(protocolFactory, encoder) { }
    responseCreator(protocolFactory, encoder) { }
    ;
    pubCreator(protocol, encoder) {
        let pub = {};
        pub = (function (...args) {
            if (pub.publisher) {
                pub.publisher(...args);
            }
            else {
                throw new Error('Unitialized');
            }
        });
        pub.register = () => {
            pub.publisher = this.messenger.getOrCreatePublish(protocol, null, encoder);
            pub.unregister = (...args) => {
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
    pushCreator(protocolFactory, encoder) {
        let push = {};
        push = (function (to, ...args) {
            if (push[to]) {
                push[to](to, ...args);
            }
            else {
                throw new Error('Unitialized');
            }
        });
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
    subCreator(protocol, id, decoder) {
        let sub = {};
        sub.register = (onSubscriptionHandler) => {
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
    pullCreator(protocolFactory) {
        let pull = {};
        pull.register = (from, onSubscriptionHandler) => {
            pull.subscriber = this.messenger.createSubscription(protocolFactory(from), protocolFactory(from), onSubscriptionHandler);
            pull.unregister = (from) => {
                this.messenger.removeAllSubscriptionsWithName(protocolFactory(from));
            };
        };
        return pull;
    }
}
exports.MessageFactory = MessageFactory;
