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
const Channel_1 = require("../../Channel/Channel");
const FrontMessages_1 = require("./FrontMessages");
const types_1 = require("../../types");
const timers_1 = require("timers");
class FrontChannel extends Channel_1.Channel {
    constructor(channelId, totalChannels, messenger, master) {
        super(channelId, messenger);
        this.master = master;
        this.CONNECTION_STATUS = types_1.CONNECTION_STATUS.DISCONNECTED;
        this.connectedChannelIds = new Set();
        this.clientConnectedCallbacks = new Map();
        this.clientConnectedTimeouts = new Map();
        this.connectedClients = new Map();
        this.linked = false;
        // front id is used for 1:1 back to front communication.
        this.frontUid = `${channelId}-${this.master.frontMasterIndex.toString()}`;
        this.frontMasterIndex = master.frontMasterIndex;
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
                return state;
            }
            catch (err) {
                throw err;
            }
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
     * sets the onPatchStateHHandler, the patch is not decoded or applied and its left for you to do that..
     * the reason for this is if you may not want to use cpu applying the patch and just want to forward it.
     * @param handler - function that gets executed after channel receives and applies patched state from .
     */
    onPatchState(handler) {
        this.onPatchStateHandler = handler;
    }
    ;
    patchState(patch) {
        this._onPatchState(patch);
    }
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
     * returns back state asynchronously.
     */
    link(clientUid = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(this.linked)) {
                this.linked = true;
            }
            this.master.linkChannel(this.backMasterIndex);
            this.pub.LINK(clientUid);
            return new Promise((resolve, reject) => {
                // if the link is for a uid it registers the event with the uid in it.
                const linkedEventId = clientUid ? `linked_${clientUid}` : 'linked';
                this.once(linkedEventId, (data) => {
                    if (data.error) {
                        return reject(data.error);
                    }
                    else {
                        return resolve(data.state);
                    }
                });
            });
        });
    }
    /**
     * sends an unlink message to back channel so it stops receiving patch updates
     */
    unlink() {
        this.linked = false;
        this.master.unlinkChannel(this.backMasterIndex);
        this.pub.UNLINK(0);
        // make sure all clients become unlinked with it.
        if (this.clientConnectedTimeouts.size > 0 || this.connectedClients.size > 0) {
            this.disconnectAllClients();
        }
    }
    /**
     * adds message to queue to master which gets sent to needed back master at a set interval.
     * @param message
     */
    addMessage(message) {
        if (!(this.linked)) {
            throw new Error('Front Channel is not linked, can not add messages to master queue.');
        }
        this.master.addQueuedMessage(message, this.backMasterIndex, this.channelId);
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
                    return reject(validated.error);
                }
                this.pub.CONNECT({
                    frontUid: this.frontUid,
                    frontMasterIndex: this.frontMasterIndex,
                    channelId: this.channelId
                });
                let connectionTimeout = setTimeout(() => {
                    return reject(`Timed out waiting for ${(this.connectedChannelIds.size - this.totalChannels)} connections`);
                }, timeout);
                let connectedChannelIds = new Set();
                let connectedBackMasterIndexes = new Set();
                this.on('connected', (channelId, backMasterIndex) => {
                    connectedChannelIds.add(channelId);
                    connectedBackMasterIndexes.add(backMasterIndex);
                    // run user defined handler. (set with onConnectedHandler())
                    this.onConnectedHandler(channelId, backMasterIndex);
                    this.connectedChannelIds.add(channelId);
                    if (this.connectedChannelIds.size === this.totalChannels) {
                        // dont need to listen for connected emition
                        // or wait for a timeout anymore
                        timers_1.clearTimeout(connectionTimeout);
                        this.removeAllListeners('connected');
                        this.CONNECTION_STATUS = types_1.CONNECTION_STATUS.CONNECTED;
                        return resolve({
                            channelIds: Array.from(connectedChannelIds.values()),
                            backMasterIndexes: Array.from(connectedBackMasterIndexes.values())
                        });
                    }
                });
            });
        });
    }
    get connectionInfo() {
        return {
            connectedChannelIds: Array.from(this.connectedChannelIds),
            connectionStatus: this.CONNECTION_STATUS,
            isLinked: this.linked,
        };
    }
    // business logic for connecting client
    _connectClient(uid) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // setup a timeout if client takes too long to receive successful connect
                this.clientConnectedTimeouts.set(uid, setTimeout(() => {
                    this.clientConnectedTimeouts.delete(uid);
                    this.emitClientLinked(uid, { error: `Client ${uid} connection request to ${this.channelId} timed out` });
                }, this.clientTimeout));
                const state = yield this.link(uid);
                timers_1.clearTimeout(this.clientConnectedTimeouts.get(uid));
                this.clientConnectedTimeouts.delete(uid);
                return state;
            }
            catch (err) {
                this.emitClientLinked(uid, err.message);
            }
        });
    }
    emitClientLinked(clientUid, data) {
        this.emit(`linked_${clientUid}`, data);
    }
    disconnectClient(clientUid) {
        if (this.connectedClients.has(clientUid)) {
            this.connectedClients.get(clientUid).onChannelDisconnect(this.channelId);
            this.connectedClients.delete(clientUid);
        }
        if (this.connectedClients.size === 0) {
            this.unlink();
        }
    }
    _onPatchState(patch) {
        if (!this.linked)
            return;
        for (let client of this.connectedClients.values()) {
            client.addStateUpdate(this.channelId, patch, types_1.STATE_UPDATE_TYPES.PATCH);
        }
        this.onPatchStateHandler(patch);
    }
    onPatchStateHandler(patch) { }
    _onMessage(message, channelId) {
        this.onMessageHandler(message, channelId);
    }
    onMessageHandler(message, channelId) {
        throw new Error(`Unimplemented onMessageHandler in front channel ${this.channelId} Use frontChannel.onMessage to implement.`);
    }
    _onConnectionChange(backChannelId, backMasterIndex, change) {
        if (change === types_1.CONNECTION_CHANGE.CONNECTED) {
            this._onConnected(backChannelId, backMasterIndex);
        }
        else if (change === types_1.CONNECTION_CHANGE.DISCONNECTED) {
            this._onDisconnect(backChannelId, backMasterIndex);
        }
        else {
            throw new Error(`Unrecognized connection change value: ${change} from backChannel: ${backChannelId}`);
        }
    }
    /**
     * registers needed pub and subs when connected and runs handler passed into onConnected(optional)
     * if its the same channelId
     * @param backChannelId
     * @param backMasterIndex - index of the Back Channel's master.
     */
    _onConnected(backChannelId, backMasterIndex) {
        // channelId of connected backChannel was the same so register pub/subs meant for mirrored channels.
        if (backChannelId === this.channelId) {
            this.backMasterIndex = backMasterIndex;
            this.sub.BROADCAST_LINKED_FRONTS.register(message => {
                //TODO: maybe this should be handled in a seperate onMirroredMessage or something similar.. will do if it seems needed.
                this._onMessage(message, this.channelId);
            });
            this.sub.ACCEPT_LINK.register((response) => {
                // check if the accepted link was for a client.
                let data = {};
                if (response.error) {
                    data.error = response.error;
                }
                else {
                    data.error = null;
                    const state = Buffer.from(response.encodedState.data);
                    data.state = state;
                }
                if (response['clientUid'] !== undefined) {
                    this.emitClientLinked(response.clientUid, data);
                }
                else {
                    this.emit('linked', data);
                }
            });
            this.pub.LINK.register();
            this.pub.UNLINK.register();
        }
        this.push.SEND_BACK.register(backChannelId);
        this.emit('connected', backChannelId, backMasterIndex);
    }
    onConnectedHandler(backChannelId, backMasterIndex) { }
    ;
    validateConnectAction(REQUEST_STATUS) {
        let validated = { success: true, error: null };
        if (REQUEST_STATUS === types_1.CONNECTION_STATUS.CONNECTING) {
            if (this.CONNECTION_STATUS === types_1.CONNECTION_STATUS.CONNECTING || this.CONNECTION_STATUS === types_1.CONNECTION_STATUS.CONNECTED) {
                validated.success = false;
                validated.error = 'Channel is connected or in the process of connecting.';
            }
        }
        /*
        if(this.CONNECTION_STATUS === CONNECTION_STATUS.DISCONNECTING) {
            validated.success = false;
            validated.error = 'Channel is in the process of disconnecting.';
        }
        */
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
            this._onConnectionChange(data.channelId, data.backMasterIndex, data.connectionStatus);
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
        return (!(this.clientConnectedTimeouts.has(clientUid)) && !(this.connectedClients.has(clientUid)));
    }
}
exports.default = FrontChannel;
