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
const Channel_1 = require("../Channel/Channel");
const FrontMessages_1 = require("./FrontMessages");
const types_1 = require("../types");
const timers_1 = require("timers");
class FrontChannel extends Channel_1.Channel {
    constructor(channelId, serverIndex, totalChannels, centrum) {
        super(channelId, centrum);
        this.CONNECTION_STATUS = types_1.CONNECTION_STATUS.DISCONNECTED;
        this.connectedChannelIds = new Set();
        this.queuedMessages = [];
        // front id is used for 1:1 back to front communication.
        this.frontUid = `${channelId}-${serverIndex.toString()}`;
        this.serverIndex = serverIndex;
        this.totalChannels = totalChannels;
        this.initializeMessageFactories();
        this.registerPreConnectedSubs();
        this.registerPreConnectedPubs();
    }
    ;
    /**
     * sets the onConnectedHandler function
     * @param handler - function that gets executed when a channel succesfully connects to a backChannel.
     */
    onConnected(handler) {
        this.onConnectedHandler = handler;
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
        this.pub.SEND_QUEUED(this.queuedMessages);
        this.clearQueued();
    }
    ;
    /**
     * sends message to mirror back channel by default if backChannelId is omitted or sends to remote back channel with specified id.
     * @param message - data sent to back channel.
     * @param backChannelId - id of back channel to send message to
     */
    send(message, backChannelId = this.channelId) {
        let data = { message, frontUid: this.frontUid };
        this.push.SEND_BACK[backChannelId](data);
    }
    /**
     * sends message to all specified backChannelIds, if omitted it will send broadcast to all connected remote and mirror back channels.
     * @param message
     * @param backChannelIds
     */
    broadcast(message, backChannelIds) {
        if (backChannelIds) {
            backChannelIds.forEach(channelId => {
                this.send(message, channelId);
            });
        }
        else {
            this.pub.BROADCAST_ALL_BACK({ frontUid: this.frontUid, message });
        }
    }
    /**
     * sends out a connection publication then as back channels reply with a connect success publication keeps track and
     * when all replied the promise gets resolved and the connection timeout gets cleared.
     * @param timeout - time in milliseconds to wait for all back channels to reply before throwing an error.
     */
    connect(timeout = 15000) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const validated = this.validateConnectAction(types_1.CONNECTION_STATUS.CONNECTING);
                if (validated.error) {
                    reject(validated.error);
                }
                this.pub.CONNECT({
                    frontUid: this.frontUid,
                    serverIndex: this.serverIndex,
                    channelId: this.channelId
                });
                let connectionTimeout = setTimeout(() => {
                    reject(`Timed out waiting for ${(this.connectedChannelIds.size - this.totalChannels)} connections`);
                }, timeout);
                this.on('connected', (channelId) => {
                    this.connectedChannelIds.add(channelId);
                    if (this.connectedChannelIds.size === this.totalChannels) {
                        timers_1.clearTimeout(connectionTimeout);
                        this.removeAllListeners('connected');
                        this.CONNECTION_STATUS = types_1.CONNECTION_STATUS.CONNECTED;
                        resolve(this.connectedChannelIds);
                    }
                });
            });
        });
    }
    /**
     * Either disconnects from given channel ids or by default disconnects from all.
     * @param channelIds - Channel Ids to disconnect from.
     * @param timeout - wait time to finish all disconnections before throwing error.
     * @returns {Promise<T>}
     */
    disconnect(channelIds, timeout = 15000) {
        return __awaiter(this, void 0, void 0, function* () {
            const awaitingChannelIds = new Set(channelIds) || this.connectedChannelIds;
            return new Promise((resolve, reject) => {
                const validated = this.validateConnectAction(types_1.CONNECTION_STATUS.DISCONNECTING);
                if (validated.error) {
                    reject(validated.error);
                }
                this.on('disconnected', (channelId) => {
                    let disconnectionTimeout = setTimeout(() => {
                        reject(`Timed out waiting for ${(awaitingChannelIds.size)} disconnections`);
                    }, timeout);
                    awaitingChannelIds.delete(channelId);
                    if (awaitingChannelIds.size === 0) {
                        timers_1.clearTimeout(disconnectionTimeout);
                        this.removeAllListeners('disconnected');
                        // if we still have some connections open keep status as connected otherwise its disconnected.
                        this.CONNECTION_STATUS = (this.connectedChannelIds.size > 0) ? types_1.CONNECTION_STATUS.CONNECTED : types_1.CONNECTION_STATUS.DISCONNECTED;
                        resolve(this.connectedChannelIds.size);
                    }
                });
            });
        });
    }
    clearQueued() {
        this.queuedMessages.length = 0;
    }
    get connectionInfo() {
        return {
            connectedChannelIds: Array.from(this.connectedChannelIds),
            connectionStatus: this.CONNECTION_STATUS,
        };
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
    _onConnectionChange(backChannelId, change, data) {
        if (change === types_1.CONNECTION_CHANGE.CONNECTED) {
            this._onConnected(backChannelId, data);
        }
        else if (change === types_1.CONNECTION_CHANGE.DISCONNECTED) {
            this._onDisconnect(backChannelId, data);
        }
        else {
            throw new Error(`Unrecognized connection change value: ${change} from backChannel: ${backChannelId}`);
        }
    }
    /**
     * registers needed pub and subs when connected and runs handler passed into onConnected(optional)
     * if its the same channelId
     * @param backChannelId
     * @param state - if its the mirrored channelId, it will have the current state as well.
     */
    _onConnected(backChannelId, state) {
        // channelId of connected backChannel was the same so register pub/subs meant for mirrored channels.
        if (backChannelId === this.channelId) {
            this.sub.BROADCAST_MIRROR_FRONTS.register(message => {
                //TODO: maybe this should be handled in a seperate onMirroredMessage or something similar.. will do if it seems needed.
                this._onMessage(message, this.channelId);
            });
            this.pub.SEND_QUEUED.register();
        }
        this.push.SEND_BACK.register(backChannelId);
        this.pub.DISCONNECT.register(backChannelId);
        this.onConnectedHandler(backChannelId, state);
        this.emit('connected', backChannelId);
    }
    onConnectedHandler(backChannelId, state) { }
    ;
    onDisconnected(backChannelId) {
        // channelId of connected backChannel was the same so register pub/subs meant for mirrored channels.
        if (backChannelId === this.channelId) {
            this.pub.SEND_QUEUED.unregister();
            //  this.sub.PATCH_STATE.remove();
        }
        this.pub.DISCONNECT.unregister();
        this.push.SEND_BACK.unregister();
    }
    validateConnectAction(REQUEST_STATUS) {
        let validated = { success: true, error: null };
        if (this.CONNECTION_STATUS === types_1.CONNECTION_STATUS.CONNECTING) {
            validated.success = true;
            validated.error = 'Channel is in the process of connecting.';
        }
        if (this.CONNECTION_STATUS === types_1.CONNECTION_STATUS.DISCONNECTING) {
            validated.success = true;
            validated.error = 'Channel is in the process of disconnecting.';
        }
        this.CONNECTION_STATUS = REQUEST_STATUS;
        return validated;
    }
    /**
     * subscriptions that we want to register pre connection.
     */
    registerPreConnectedSubs() {
        //todo: create some sort of front SERVER class wrapper so we can optimaly handle backChannel -> front SERVER messages (things that not every channel need to handle)
        this.sub.SEND_FRONT.register(data => {
            this._onMessage(data.message, data.channelId);
        });
        this.sub.CONNECTION_CHANGE.register(data => {
            //todo: refactor to look cleaner for when I eventually pass in state.
            this._onConnectionChange(data.channelId, data.connectionStatus);
        });
        this.sub.BROADCAST_ALL_FRONTS.register(data => {
            this._onMessage(data.message, data.channelId);
        });
    }
    /**
     * Publications we initialize before connections are made.
     */
    registerPreConnectedPubs() {
        this.pub.CONNECT.register();
        this.pub.BROADCAST_ALL_BACK.register();
    }
    /**
     * initializes needed message factories for front channels.
     */
    initializeMessageFactories() {
        const { pub, push, sub } = new FrontMessages_1.FrontMessages(this.centrum, this);
        this.pub = pub;
        this.push = push;
        this.sub = sub;
    }
}
exports.default = FrontChannel;
