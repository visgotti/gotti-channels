"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Channel_1 = require("../Channel/Channel");
const BackMessages_1 = require("./BackMessages");
const types_1 = require("../types");
class BackChannel extends Channel_1.Channel {
    constructor(channelId, centrum) {
        super(channelId, centrum);
        this._connectedFrontsData = new Map();
        this._mirroredFrontUids = new Set();
        this._connectedClientsData = new Map();
        this._writingClientUids = new Set();
        this._listeningClientUids = new Set();
        this.initializeMessageFactories();
        this.registerPreConnectedSubs();
        this.registerPreConnectedPubs();
    }
    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and frontUid
     */
    onMessage(handler) {
        this.onMessageHandler = handler;
    }
    broadcastPatchedState() {
        // this.sendPatchedStateHandler();
    }
    ;
    broadcastSetState() {
        // this.sendSetStateHandler();
    }
    ;
    /**
     * sends message to specific front channel based on frontUid
     * @param message - data sent to back channel.
     * @param frontUid - uid of front channel to send message to
     */
    send(message, frontUid) {
        this.push.SEND_FRONT[frontUid]({ message, channelId: this.channelId });
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
            this.pub.BROADCAST_ALL_FRONTS({
                message,
                channelId: this.channelId,
            });
        }
    }
    /**
     * sends message to all front channels that share channelId with back channel.
     * @param message
     */
    broadcastMirrored(message) {
        this.pub.BROADCAST_MIRROR_FRONTS(message);
    }
    getFrontUidForClient(clientUid) {
        return this._connectedClientsData.get(clientUid).frontUid;
    }
    get connectedFrontsData() {
        return this._connectedFrontsData;
    }
    get mirroredFrontUids() {
        return Array.from(this._mirroredFrontUids);
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
    registerPreConnectedSubs() {
        // registers sub that handles requests the same regardless of the frontUid.
        this.sub.CONNECT.register(this.onFrontConnected.bind(this));
        this.sub.BROADCAST_ALL_BACK.register((data) => {
            const { message, frontUid } = data;
            this._onMessage(message, frontUid);
        });
        this.sub.SEND_BACK.register((data) => {
            const { message, frontUid } = data;
            this._onMessage(message, frontUid);
        });
    }
    /**
     * publications that we want to be able to send out before channels start connecting.
     */
    registerPreConnectedPubs() {
        // handler that broadcasts instance already exists on centrum before creating it if its not the first backChannel instantiated
        this.pub.BROADCAST_ALL_FRONTS.register();
        this.pub.BROADCAST_MIRROR_FRONTS.register();
    }
    /**
     * initializes channel pub and sub  handlers when we receive a connect message from front channel.
     * @param frontData - { channelId, frontUid, frontServerIndex }
     */
    onFrontConnected(frontData) {
        const { channelId, frontUid, serverIndex } = frontData;
        if (channelId === this.channelId) {
            this.pull.SEND_QUEUED.register(frontUid, (messages => {
                for (let i = 0; i < messages.length; i++) {
                    this.onMessageHandler(messages[i], frontUid);
                }
            }));
            // add to mirror set since its same channelId
            this._mirroredFrontUids.add(frontUid);
        }
        // keep connected data stored for all fronts.
        this._connectedFrontsData.set(frontUid, frontData);
        // register send pusher for unique frontuid.
        //TODO: optimize so instead of keeping a 1:1 push for each front uid, keep a 1:1 push to serverIndex of frontuid and then the correct handler will be callled
        this.push.SEND_FRONT.register(frontUid);
        // create push then remove since this wont be done again unless theres a disconnection.
        this.push.CONNECTION_CHANGE.register(frontUid);
        this.push.CONNECTION_CHANGE[frontUid]({ channelId: this.channelId, connectionStatus: types_1.CONNECTION_STATUS.CONNECTED });
        this.push.CONNECTION_CHANGE.unregister();
    }
    /**
     * initializes needed message factories for front channels.
     */
    initializeMessageFactories() {
        const { pub, push, sub, pull } = new BackMessages_1.BackMessages(this.centrum, this);
        this.pub = pub;
        this.push = push;
        this.sub = sub;
        this.pull = pull;
    }
}
exports.default = BackChannel;
