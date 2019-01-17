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
        this.clientLinkTimeouts = new Map();
        this.linkedClients = new Map();
        this.listeningClientUids = [];
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
     * Sends link 'request' to back channel. It will respond with the back channel's current
     * state asynchronously, if we call link with a clientUid it will behave the same but
     * the parameter will be kept in a lookup on the back master so it can keep track of which
     * front master a client lives on. This allows the ability to send direct messages to the client
     * from the back.
     * @param client - Centrum client instance
     * @param options (optional) if you want to send data as a client connects
     * @returns {Promise<T>}
     */
    linkClient(client, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const clientUid = client.uid;
            if (!(this.linked))
                this.linked = true;
            if (!(this.clientCanLink(clientUid)))
                throw new Error('Client is already in connection state.');
            // set timeout for client linking
            this.clientLinkTimeouts.set(clientUid, setTimeout(() => {
                this.clientLinkTimeouts.delete(clientUid);
                this.emitClientLinked(clientUid, null, { error: `Client ${clientUid} connection request to ${this.channelId} timed out` });
            }, this.clientTimeout));
            options ? this.pub.LINK([clientUid, options]) : this.pub.LINK([clientUid]);
            return new Promise((resolve, reject) => {
                // if the link is for a uid it registers the event with the uid in it.
                const linkedEventId = `linked_${clientUid}`;
                this.once(linkedEventId, (encodedState, responseOptions) => {
                    timers_1.clearTimeout(this.clientLinkTimeouts.get(clientUid));
                    this.clientLinkTimeouts.delete(clientUid);
                    if (responseOptions && responseOptions.error) {
                        return reject(responseOptions.error);
                    }
                    this.linkedClients.set(clientUid, client);
                    this.listeningClientUids.push(clientUid);
                    this.master.linkChannel(this.backMasterIndex);
                    return resolve({ encodedState, responseOptions });
                });
            });
        });
    }
    /**
     * sends unlink message, it will decrement or remove the client lookup data on the back,
     * the back channel checks if there are any clients left with a link to the front master
     * and if not it will stop keeping track of it until it receives another link.
     * @param clientUid
     */
    unlinkClient(clientUid, options) {
        if (this.linkedClients.has(clientUid)) {
            const index = this.listeningClientUids.indexOf(clientUid);
            if (index > -1) {
                this.listeningClientUids.splice(index, 1);
            }
            this.linkedClients.get(clientUid).onChannelDisconnect(this.channelId);
            this.linkedClients.delete(clientUid);
        }
        else if (this.clientLinkTimeouts.has(clientUid)) {
            timers_1.clearTimeout(this.clientLinkTimeouts.get(clientUid));
            this.clientLinkTimeouts.delete(clientUid);
        }
        options ? this.pub.UNLINK([clientUid, options]) : this.pub.UNLINK([clientUid]);
        if (this.linkedClients.size === 0 && this.clientLinkTimeouts.size === 0) {
            this.linked = false;
            this.master.unlinkChannel(this.backMasterIndex);
        }
    }
    /**
     * sends notification to mirror back channel that it will be receiving messages
     * from client to process.
     * @param clientUid
     * @param options
     */
    addClientWrite(clientUid, options) {
        this.pub.ADD_CLIENT_WRITE([clientUid, options]);
    }
    /**
     * sends notification to mirror back channel that it will no longer
     * be receiving messages from client.
     * @param clientUid
     * @param options
     */
    removeClientWrite(clientUid, options) {
        this.pub.REMOVE_CLIENT_WRITE([clientUid, options]);
    }
    /**
     * adds message to the front master's message queue. These queue up and will then send
     * to the appropriate back master at a set interval, where upon reaching the back master,
     * the back master will iterate through the messages received and dispatch them to the child
     * back channels to process.
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
    emitClientLinked(clientUid, encodedState, responseOptions) {
        this.emit(`linked_${clientUid}`, encodedState, responseOptions);
    }
    _onPatchState(patch) {
        if (!this.linked)
            return;
        for (let client of this.linkedClients.values()) {
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
            this.sub.ACCEPT_LINK.register((data) => {
                // data[0] - encodedState
                // data[1] - clientUid
                // data[2] - responseOptions
                this.emitClientLinked(data[1], data[0], data[2]);
            });
            this.pub.LINK.register();
            this.pub.UNLINK.register();
            this.pub.ADD_CLIENT_WRITE.register();
            this.pub.REMOVE_CLIENT_WRITE.register();
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
    clientCanLink(clientUid) {
        return (!(this.clientLinkTimeouts.has(clientUid)) && !(this.linkedClients.has(clientUid)));
    }
}
exports.default = FrontChannel;
