"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Channel_1 = require("./Channel/Channel");
const Protocol_1 = require("./Protocol");
const timers_1 = require("timers");
class FrontChannel extends Channel_1.Channel {
    constructor(channelId, frontServerIndex, backChannels, centrum) {
        super(channelId, centrum);
        this.channelMessageHandlers = new Map();
        this.queuedMessages = [];
        // front id is used for 1:1 back to front communication.
        this.frontUid = `${channelId}-${frontServerIndex.toString()}`;
        this.frontServerIndex = frontServerIndex;
        this.backChannels = backChannels;
        this.initializePreConnectedPubs();
        this.initializePreConnectSubs();
    }
    ;
    /**
     * sets the setStateHandler function
     * @param handler - function that gets executed when mirror back channel sends whole state
     */
    onSetState(handler) {
        this.onSetStateHandler = handler;
    }
    ;
    /**
     * sets the patchStateHandler function
     * @param handler - function that gets executed after channel receives and applies patched state from .
     */
    onPatchState(handler) {
        this.onPatchStateHandler = handler;
    }
    ;
    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and channelId
     */
    onMessage(handler) {
        this.onMessageHandler = handler;
    }
    ;
    /**
     * adds message to queue to be sent to mirror back channel when broadcastQueued() is called.
     * @param message
     * @returns number - length of queued messages
     */
    addMessage(message) {
        this.queuedMessages.push(message);
        return this.queuedMessages.length;
    }
    ;
    /**
     * used to publish all queued messages to mirror back channel queuedMessages is emptied when called.
     */
    sendQueued() {
        this.sendQueuedHandler(this.queuedMessages);
        this.queuedMessages.length = 0;
    }
    ;
    /**
     * sends message to mirror back channel by default if backChannelId is omitted or sends to remote back channel with specified id.
     * @param message - data sent to back channel.
     * @param backChannelId - id of back channel to send message to
     */
    send(message, backChannelId = this.channelId) {
        this.channelMessageHandlers[backChannelId].send(this.frontUid, message);
    }
    /**
     * sends message to all specified backChannelIds, if omitted it will send broadcast to all connected remote and mirror back channels.
     * @param message
     * @param backChannelIds
     */
    broadcast(message, backChannelIds) {
        // we were given channelIds to broadcast specifically to, iterate and use send handler/protocol
        if (backChannelIds) {
            backChannelIds.forEach(channelId => {
                this.send(message, channelId);
            });
            // no backChannels were given so use broadcastAll handler/protocol
        }
        else {
            this.broadcastAllHandler(message);
        }
    }
    /**
     * sends out a connection publication then as back channels reply with a connect success publication keeps track and
     * when all replied the promise gets resolved and the connection timeout gets cleared.
     * @param timeout - time in milliseconds to wait for all back channels to reply before throwing an error.
     */
    connect(timeout = 5000) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.connectHandler({
                    frontUid: this.frontUid,
                    frontServerIndex: this.frontServerIndex,
                    channelId: this.channelId
                });
                let connectionTimeout = setTimeout(() => {
                    throw new Error(`Timed out waiting for ${(this.connectedChannelIds.size - this.backChannels)} connections`);
                }, 5000);
                this.on('connected', (channelId) => {
                    this.connectedChannelIds.add(channelId);
                    if (this.connectedChannelIds.size === this.backChannels) {
                        timers_1.clearTimeout(connectionTimeout);
                        this.off('connected');
                        return this.connectedChannelIds;
                    }
                });
            }
            catch (err) {
                throw err;
            }
        });
    }
    _onSetState(stateData) {
        this._setState(stateData);
        this.onSetStateHandler(stateData);
    }
    onSetStateHandler(stateData) { }
    _onPatchState(patches) {
        const stateData = this.patchState(patches);
        this.onPatchedStateHandler(patches, stateData);
    }
    onPatchedStateHandler(patches, stateData) { }
    _onMessage(message, channelId) {
        this.onMessageHandler(message, channelId);
    }
    onMessageHandler(message, channelId) {
        throw new Error(`Unimplemented onMessageHandler in front channel ${this.channelId} Use frontChannel.onMessage to implement.`);
    }
    disconnect(channelId) {
    }
    /**
     * subscriptions that we want to register pre connection.
     */
    initializePreConnectSubs() {
        //todo: create some sort of front SERVER class wrapper so we can optimaly handle backChannel -> front SERVER messages (things that not every channel need to handle)
        // let handlerName = Protocol.SEND_FRONT_SERVER, this.frontServerIndex);
        /*  this.centrum.createSubscription(handlerName, (data: BackToFrontMessage) => {
              const { message, channelId } = data;
              this._onMessage(message, channelId);
          });
          */
        this.centrum.createSubscription(Protocol_1.default.SEND_FRONT(this.frontUid), (data) => {
            const { message, channelId } = data;
            this._onMessage(message, channelId);
        });
        this.centrum.createSubscription(Protocol_1.default.CONNECT_SUCCESS(this.frontUid), (data) => {
            if (data.frontUid === this.frontUid) {
                this.onConnected(data.channelId);
            }
        });
    }
    /**
     * Publications we initialize before connections are made.
     */
    initializePreConnectedPubs() {
        // channels live on same process so they share centrum instance and can share publishers so check if it exists before creating.
        if (!(this.centrum.publish[Protocol_1.default.CONNECT()])) {
            this.centrum.createPublish(Protocol_1.default.CONNECT());
        }
        this.connectHandler = this.centrum.publish[Protocol_1.default.CONNECT()];
        if (!(this.centrum.publish[Protocol_1.default.BROADCAST_ALL_BACK()])) {
            this.centrum.createPublish(Protocol_1.default.BROADCAST_ALL_BACK());
        }
        this.broadcastAllHandler = this.centrum.publish[Protocol_1.default.BROADCAST_ALL_BACK()];
    }
    /**
     * initializes centrum pub and subs when connected
     * @param backChannelId
     */
    onConnected(backChannelId) {
        // channelId of connected backChannel was the same so register pub/subs meant for mirrored channels.
        if (backChannelId === this.channelId) {
            this.centrum.createSubscription(Protocol_1.default.PATCH_STATE(this.channelId), (patches) => {
                this._onPatchState(patches);
            });
            this.centrum.createSubscription(Protocol_1.default.SET_STATE(this.channelId), (stateData) => {
                this._onSetState(stateData);
            });
            // for when back broadcasts to all mirror fronts
            this.centrum.createSubscription(Protocol_1.default.BROADCAST_MIRROR_FRONTS(this.channelId), (message) => {
                this._onMessage(message, this.channelId);
            });
            // for when back broadcasts to all channels
            this.centrum.createSubscription(Protocol_1.default.BROADCAST_ALL_FRONTS(), (data) => {
                this._onMessage(data.message, data.channelId);
            });
            //register sendQueued
            this.sendQueuedHandler = this.centrum.createPublish(Protocol_1.default.SEND_QUEUED(this.frontUid));
        }
        // check to see if following publishers were already initialized for centrum instance.
        const sendHandler = this.centrum.getOrCreatePublish(Protocol_1.default.SEND_BACK(backChannelId), (fromFrontId, message) => {
            return {
                frontUid: fromFrontId,
                message,
            };
        });
        const disconnectHandler = this.centrum.getOrCreatePublish(Protocol_1.default.DISCONNECT(backChannelId), (fromFrontId, message) => {
            return {
                frontUid: fromFrontId,
                message,
            };
        });
        //TODO see if i can bind these uniquely with this.frontUid as first param
        this.channelMessageHandlers.set(backChannelId, {
            'send': sendHandler,
            'disconnect': disconnectHandler
        });
        this.emit('connected', backChannelId);
    }
}
exports.FrontChannel = FrontChannel;
