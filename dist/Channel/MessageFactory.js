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
    // BACK -> FRONT
    MSG_CODES[MSG_CODES["CONNECTION_CHANGE"] = 5] = "CONNECTION_CHANGE";
    MSG_CODES[MSG_CODES["BROADCAST_MIRROR_FRONTS"] = 6] = "BROADCAST_MIRROR_FRONTS";
    MSG_CODES[MSG_CODES["BROADCAST_ALL_FRONTS"] = 7] = "BROADCAST_ALL_FRONTS";
    MSG_CODES[MSG_CODES["SEND_FRONT"] = 8] = "SEND_FRONT";
    MSG_CODES[MSG_CODES["SET_STATE"] = 9] = "SET_STATE";
    MSG_CODES[MSG_CODES["PATCH_STATE"] = 10] = "PATCH_STATE";
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
    // BACK -> FRONTS
    static BROADCAST_MIRROR_FRONTS(frontChannelId) { return Protocol.make(MSG_CODES.BROADCAST_MIRROR_FRONTS, frontChannelId); }
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
    constructor(centrum, channel) {
        this.channelId = channel.channelId;
        this.channel = channel;
        this.centrum = centrum;
    }
    pubCreator(protocol) {
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
            pub.publisher = this.centrum.getOrCreatePublish(protocol);
            pub.unregister = (...args) => {
                this.centrum.removePublish(protocol);
            };
        };
        return pub;
    }
    /**
     * push will use the same centrum publisher so any registered subs will receive it but since the recipients
     * can change dynamically we want to be able to just give a 'to' parameter to create push and have the protocol
     * factory create the message name for us.
     * @param protocolFactory - Function used to create the publisher name based on the to parameter passed in.
     */
    pushCreator(protocolFactory) {
        let push = {};
        push = (function (to, ...args) {
            if (push[to]) {
                push[to](to, ...args);
            }
            else {
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
    subCreator(protocol, id) {
        let sub = {};
        sub.register = (onSubscriptionHandler) => {
            sub.subscriber = this.centrum.createOrAddSubscription(protocol, id, onSubscriptionHandler);
            sub.unregister = () => {
                this.centrum.removeSubscriptionById(protocol, id);
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
            pull.subscriber = this.centrum.createSubscription(protocolFactory(from), protocolFactory(from), onSubscriptionHandler);
            pull.unregister = (from) => {
                this.centrum.removeAllSubscriptionsWithName(protocolFactory(from));
            };
        };
        return pull;
    }
}
exports.MessageFactory = MessageFactory;
