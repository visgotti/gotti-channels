"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fossilDelta = require("fossil-delta");
const msgpack = require("notepack.io");
const Channel_1 = require("../../Channel/Channel");
const BackMessages_1 = require("./BackMessages");
const types_1 = require("../../types");
class BackChannel extends Channel_1.Channel {
    constructor(channelId, messenger, master) {
        super(channelId, messenger);
        this.master = master;
        this.backMasterIndex = this.master.backMasterIndex;
        // frontUid defines a unique channel that lives on a frontMaster which is identified
        // by frontMasterIndex (index of the server in the cluster) but it's literally
        // just the id of the server all the channels live on.
        this.linkedFrontUids = new Set();
        this.linkedFrontMasterIndexes = [];
        // keep track of all frontUids by their master's id/index.
        this.masterIndexToFrontUidLookup = {};
        this.state = null;
        this._previousState = null;
        this._connectedFrontsData = new Map();
        this._mirroredFrontUids = new Set();
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
    /**
     * sends state patches to mirrored channels
     * @returns {boolean}
     */
    patchState() {
        if (!(this.state)) {
            throw new Error('null state');
        }
        if (this.linkedFrontUids.size > 0) {
            const currentState = this.state;
            const currentStateEncoded = msgpack.encode(currentState);
            if (currentStateEncoded.equals(this._previousStateEncoded)) {
                return false;
            }
            const patches = fossilDelta.create(this._previousStateEncoded, currentStateEncoded);
            this._previousStateEncoded = currentStateEncoded;
            // supply master server with patches and the array of linked master indexes that need the patches.
            this.master.addStatePatch(this.linkedFrontMasterIndexes, [this.channelId, patches]);
            return true;
        }
        return false;
    }
    ;
    /**
     *  accepts link from front channel and sends back state for it to be retrieved asynchronously.
     */
    acceptLink(frontUid, clientUid) {
        const sendData = {};
        if (clientUid) {
            sendData.clientUid = clientUid;
        }
        if (!(this.state)) {
            sendData.error = 'null state on back channel, failed to link.';
        }
        else {
            sendData.encodedState = this._previousStateEncoded;
        }
        this.push.ACCEPT_LINK[frontUid](sendData);
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
    broadcastLinked(message) {
        this.linkedFrontUids.forEach(frontUid => {
            this.push.BROADCAST_LINKED_FRONTS[frontUid](message);
        });
    }
    setState(newState) {
        this._previousStateEncoded = msgpack.encode(newState);
        this.state = newState;
    }
    processMessageFromMaster(message, frontMasterIndex) {
        const frontUid = this.masterIndexToFrontUidLookup[frontMasterIndex];
        this._onMessage(message, frontUid);
    }
    get connectedFrontsData() {
        return this._connectedFrontsData;
    }
    get mirroredFrontUids() {
        return Array.from(this._mirroredFrontUids);
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
        this.sub.CONNECT.register(this.onMirrorConnected.bind(this));
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
        // handler that broadcasts instance already exists on messenger before creating it if its not the first backChannel instantiated
        this.pub.BROADCAST_ALL_FRONTS.register();
    }
    /**
     * initializes channel pub and sub  handlers when we receive a connect message from front channel.
     * @param frontData - { channelId, frontUid, frontMasterIndex }
     */
    onMirrorConnected(frontData) {
        const { channelId, frontUid, frontMasterIndex } = frontData;
        //notify back master a new front channel connected so it can keep track of front master connections
        this.master.onChannelConnection(frontMasterIndex);
        if (channelId === this.channelId) {
            // add to mirror set since its same channelId
            this._mirroredFrontUids.add(frontUid);
            // add the frontUid to masterIndexLookup for when processing future requests and need to know frontUid.
            this.masterIndexToFrontUidLookup[frontMasterIndex] = frontUid;
            this.push.ACCEPT_LINK.register(frontUid);
            this.push.BROADCAST_LINKED_FRONTS.register(frontUid);
            this.pull.LINK.register(frontUid, (clientUid) => {
                this.linkedFrontMasterIndexes.push(frontMasterIndex);
                this.linkedFrontUids.add(frontUid);
                this.acceptLink(frontUid, clientUid);
                // notify the master with the front master index of connected channel.
                this.master.linkedChannelFrom(frontMasterIndex);
            });
            this.pull.UNLINK.register(frontUid, () => {
                this.linkedFrontMasterIndexes.splice(this.linkedFrontMasterIndexes.indexOf(frontMasterIndex), 1);
                this.linkedFrontUids.delete(frontUid);
                this.master.unlinkedChannelFrom(frontMasterIndex);
            });
        }
        // keep connected data stored for all fronts.
        this._connectedFrontsData.set(frontUid, frontData);
        // register send pusher for unique frontuid.
        //TODO: optimize so instead of keeping a 1:1 push for each front uid, keep a 1:1 push to frontMasterIndex of frontuid and then the correct handler will be callled
        this.push.SEND_FRONT.register(frontUid);
        // create push then remove since this wont be done again unless theres a disconnection.
        this.push.CONNECTION_CHANGE.register(frontUid);
        this.push.CONNECTION_CHANGE[frontUid]({ channelId: this.channelId, backMasterIndex: this.backMasterIndex, connectionStatus: types_1.CONNECTION_STATUS.CONNECTED });
        this.push.CONNECTION_CHANGE.unregister();
    }
    /**
     * initializes needed message factories for front channels.
     */
    initializeMessageFactories() {
        const { pub, push, sub, pull } = new BackMessages_1.BackMessages(this.messenger, this);
        this.pub = pub;
        this.push = push;
        this.sub = sub;
        this.pull = pull;
    }
}
exports.default = BackChannel;
