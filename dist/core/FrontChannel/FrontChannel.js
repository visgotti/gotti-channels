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
    constructor(channelId, serverIndex, totalChannels, messenger) {
        super(channelId, messenger);
        this.CONNECTION_STATUS = types_1.CONNECTION_STATUS.DISCONNECTED;
        this.connectedChannelIds = new Set();
        this.clientConnectedCallbacks = new Map();
        this.clientConnectedTimeouts = new Map();
        this.connectedClients = new Map();
        this.queuedMessages = [];
        this.linked = false;
        // front id is used for 1:1 back to front communication.
        this.frontUid = `${channelId}-${serverIndex.toString()}`;
        this.serverIndex = serverIndex;
        this.totalChannels = totalChannels;
        //TODO: do a retry system if client still needs connection.
        this.clientTimeout = 5000;
        this.initializeMessageFactories();
        this.registerPreConnectedSubs();
        this.registerPreConnectedPubs();
    }
    ;
    /**
     *
     * @param client
     * @param timeout
     */
    connectClient(client, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!(this.clientCanConnect(client.uid)))
                    throw new Error('Client is already in connection state.');
                const state = yield this._connectClient(client.uid);
                this.connectedClients.set(client.uid, client);
                console.log('if this wasnt first', state);
                return state;
            }
            catch (err) {
                throw err;
            }
            console.log('not returning async');
            // add client to awaiting connections with a callback to initialize the client with the state
        });
    }
    /**
     * sets the onConnectedHandler function
     * @param handler - function that gets executed when a channel succesfully connects to a backChannel.
     */
    onConnected(handler) {
        this.onConnectedHandler = handler;
    }
    ;
    /**
     * sets the setStateHandler function, the state is not decoded for same reason as the patches
     * are not. you may want to just blindly pass it along and not waste cpu decoding it.
     * @param handler - function that gets executed when mirror back channel sends whole state
     */
    onSetState(handler) {
        this.onSetStateHandler = handler;
    }
    ;
    /**
     * sets the onPatchStateHHandler, the patch is not decoded or applied and its left for you to do that..
     * the reason for this is if you may not want to use cpu applying the patch and just want to forward it.
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
     * sends a link message to mirror back channel to notify it that it needs to receive current state and then
     * receive patches and messages. if theres a client uid to initiate the link, the back server will respond with
     * the clientUid when it replies with state which gets used to call the callback in clientConnectedCallbacks map
     */
    link(clientUid = false) {
        this.linked = true;
        this.pub.LINK(clientUid);
    }
    /**
     * sends an unlink message to back channel so it stops receiving patch updates
     */
    unlink() {
        this.linked = false;
        this.pub.UNLINK(0);
        // make sure all clients become unlinked with it.
        if (this.clientConnectedCallbacks.size > 0 || this.connectedClients.size > 0) {
            this.disconnectAllClients();
        }
    }
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
    get state() {
        return this._state;
    }
    get connectionInfo() {
        return {
            connectedChannelIds: Array.from(this.connectedChannelIds),
            connectionStatus: this.CONNECTION_STATUS,
        };
    }
    // business logic for connecting client
    _connectClient(uid) {
        return __awaiter(this, void 0, void 0, function* () {
            this.link(uid);
            return new Promise((resolve, reject) => {
                this.clientConnectedCallbacks.set(uid, (state) => {
                    this.clientConnectedCallbacks.delete(uid);
                    timers_1.clearTimeout(this.clientConnectedTimeouts.get(uid));
                    this.clientConnectedTimeouts.delete(uid);
                    if (state === false) {
                        reject(new Error('Client disconnected during connection'));
                    }
                    resolve(state);
                });
                this.clientConnectedTimeouts.set(uid, setTimeout(() => {
                    this.clientConnectedCallbacks.delete(uid);
                    this.clientConnectedTimeouts.delete(uid);
                    reject(new Error(`Client ${uid} connection request to ${this.channelId} timed out`));
                }, this.clientTimeout));
            });
        });
    }
    disconnectClient(clientUid) {
        if (this.clientConnectedCallbacks.has(clientUid)) {
            // if the client was still waiting for callback to be called, call it with false state so the promise gets rejected.
            this.clientConnectedCallbacks.get(clientUid)(false);
        }
        if (this.connectedClients.has(clientUid)) {
            this.connectedClients[clientUid].onChannelDisconnect(this.channelId);
            this.connectedClients.delete(clientUid);
        }
        // after client finishes disconnecting check if we still have any clients, if not then unlink from back channel.
        if (this.clientConnectedCallbacks.size === 0 && this.connectedClients.size === 0) {
            this.unlink();
        }
    }
    disconnectAllClients() {
        Object.keys(this.clientConnectedCallbacks).forEach(clientUid => {
            this.disconnectClient(clientUid);
        });
        Object.keys(this.connectedClients).forEach(clientUid => {
            this.disconnectClient(clientUid);
        });
    }
    _onSetState(encodedState, clientUid) {
        if (!this.linked)
            return;
        if (clientUid) {
            this.handleSetStateForClient(encodedState, clientUid);
        }
        this.onSetStateHandler(encodedState, clientUid);
    }
    /**
     * received full state from back channel, check if its for
     * a client awaiting for its connected callback and then
     * check if the client is in the connected map
     * @param clientUid
     * @param state
     */
    handleSetStateForClient(state, clientUid) {
        console.log('client uid was', clientUid);
        if (this.clientConnectedCallbacks.has(clientUid)) {
            this.clientConnectedCallbacks.get(clientUid)(state);
            return true;
        }
        else if (this.connectedClients.has(clientUid)) {
            const client = this.connectedClients.get(clientUid);
            client.addEncodedStateSet(this.channelId, state);
            return true;
        }
        else {
            console.warn('tried handling state for a client not in channel.');
        }
    }
    onSetStateHandler(newState, clientUid) { }
    _onPatchState(patches) {
        if (!this.linked)
            return;
        for (let client of this.connectedClients.values()) {
            client.addEncodedStatePatch(this.channelId, patches);
        }
        this.onPatchStateHandler(patches);
    }
    onPatchStateHandler(patches) { }
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
            this.sub.BROADCAST_LINKED_FRONTS.register(message => {
                //TODO: maybe this should be handled in a seperate onMirroredMessage or something similar.. will do if it seems needed.
                this._onMessage(message, this.channelId);
            });
            this.sub.PATCH_STATE.register(this._onPatchState.bind(this));
            this.sub.SET_STATE.register((received) => {
                this._onSetState(Buffer.from(received.encodedState.data), received.clientUid);
            });
            this.pub.SEND_QUEUED.register();
            this.pub.LINK.register();
            this.pub.UNLINK.register();
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
        }
        this.pub.DISCONNECT.unregister();
        this.push.SEND_BACK.unregister();
    }
    validateConnectAction(REQUEST_STATUS) {
        let validated = { success: true, error: null };
        if (this.CONNECTION_STATUS === types_1.CONNECTION_STATUS.CONNECTING) {
            validated.success = false;
            validated.error = 'Channel is in the process of connecting.';
        }
        if (this.CONNECTION_STATUS === types_1.CONNECTION_STATUS.DISCONNECTING) {
            validated.success = false;
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
        const { pub, push, sub } = new FrontMessages_1.FrontMessages(this.messenger, this);
        this.pub = pub;
        this.push = push;
        this.sub = sub;
    }
    clientCanConnect(clientUid) {
        return (!(this.clientConnectedCallbacks.has(clientUid)) && !(this.connectedClients.has(clientUid)));
    }
}
exports.default = FrontChannel;
