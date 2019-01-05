"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Channel_1 = require("./Channel/Channel");
const Protocol_1 = require("./Protocol");
class BackChannel extends Channel_1.Channel {
    constructor(channelId, centrum) {
        super(channelId, centrum);
        this.frontServerLookup = new Map();
        this.channelMessageHandlers = new Map();
        this.initializePreConnectSubs();
        this.initializePreConnectPubs();
    }
    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and frontUid
     */
    onMessage(handler) {
        this.onMessageHandler = handler;
    }
    broadcastPatchedState() {
        this.sendPatchedStateHandler();
    }
    ;
    broadcastSetState() {
        this.sendSetStateHandler();
    }
    ;
    /**
     * sends message to specific front channel based on frontUid
     * @param message - data sent to back channel.
     * @param frontUid - uid of front channel to send message to
     */
    send(message, frontUid) {
        this.channelMessageHandlers[frontUid].send(this.channelId, message);
    }
    /**
     * sends message to supplied front channels based on frontUids or if omitted broadcasts to all front channels regardless of channel Id.
     * @param message
     * @param frontUids
     */
    broadcast(message, frontUids) {
        if (frontUids) {
            frontUids.forEach(frontUid => {
                this.send(message, frontUid);
            });
        }
        else {
            this.broadcastAllHandler(this.channelId, message);
        }
    }
    /**
     * sends message to all front channels that share channelId with back channel.
     * @param message
     * @param frontUids
     */
    broadcastMirrored(message) {
        this.broadcastMirrorHandler(message);
    }
    onMessageQueue(messages, frontUid) {
        for (let i = 0; i < messages.length; i++) {
            this._onMessage(messages[i], frontUid);
        }
    }
    _onMessage(message, frontUid) {
        this.onMessageHandler(message, frontUid);
    }
    onMessageHandler(message, frontUid) {
        throw new Error(`Unimplemented onMessageHandler in back channel ${this.channelId} Use backChannel.onMessage to implement.`);
    }
    /**
     * subscriptions that we want to register before front channels start connecting.
     */
    initializePreConnectSubs() {
        // registers sub that handles a front channel connection request.
        this.centrum.createSubscription(Protocol_1.default.CONNECT(), (data) => {
            this.onFrontChannelConnected(data);
        });
        this.centrum.createSubscription(Protocol_1.default.SEND_BACK(this.channelId), (data) => {
            const { message, frontUid } = data;
            this._onMessage(message, frontUid);
        });
        this.centrum.createSubscription(Protocol_1.default.BROADCAST_ALL_BACK(), (data) => {
            const { message, frontUid } = data;
            this._onMessage(message, frontUid);
        });
    }
    /**
     * publications that we want to be able to send out before channels start connecting.
     */
    initializePreConnectPubs() {
        // handler that broadcasts instance already exists on centrum before creating it if its not the first backChannel instantiated
        this.broadcastAllHandler = this.centrum.getOrCreatePublish(Protocol_1.default.BROADCAST_ALL_FRONTS(), (fromChannelId, message) => {
            return {
                channelId: fromChannelId,
                message,
            };
        });
        this.broadcastMirrorHandler = this.centrum.createPublish(Protocol_1.default.BROADCAST_MIRROR_FRONTS(this.channelId));
    }
    /**
     * initializes channel pub and sub  handlers when we receive a connect message from front channel.
     * @param frontData - { channelId, frontUid, frontServerIndex }
     */
    onFrontChannelConnected(frontData) {
        const { channelId, frontUid, frontServerIndex } = frontData;
        if (channelId === this.channelId) {
            // channelId of connecting frontChannel was the same so register pub/subs meant for mirrored channels.
            this.centrum.createSubscription(Protocol_1.default.SEND_QUEUED(frontUid), (messages => {
                this.onMessageHandler(messages, frontUid);
            }));
        }
        this.frontServerLookup.set(frontUid, frontServerIndex);
        this.channelMessageHandlers.set(frontUid, {
            'send': this.centrum.getOrCreatePublish(Protocol_1.default.SEND_FRONT(frontUid), (backChannelId, message) => {
                return {
                    channelId: backChannelId,
                    message,
                };
            })
        });
        // create the confirm request publisher, send the message, then remove publisher since it wont
        // be used again unless it disconnects and connects again, then it will do same process.
        let _connectSuccessProtocol = Protocol_1.default.CONNECT_SUCCESS(frontUid);
        this.centrum.createPublish(_connectSuccessProtocol);
        this.centrum.publish[_connectSuccessProtocol]();
        this.centrum.removePublish(_connectSuccessProtocol);
    }
}
exports.BackChannel = BackChannel;
