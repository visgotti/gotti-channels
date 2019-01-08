"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const protocol_1 = require("./protocol");
const Channel_1 = require("./Channel/Channel");
class BackChannel extends Channel_1.Channel {
    constructor(id, centrum) {
        super(id, centrum);
        this.connectedFrontChannels = new Map();
        this.initializeCentrumPublications();
        this.initializeCentrumSubscriptions();
    }
    onMessage(handler) {
        this.onMessageHandler = handler;
    }
    ;
    onSetState(stateData) { }
    ;
    onPatchState(any) { }
    ;
    /**
     * Sends message to either all sibling front channels
     * or a specified one if provided a valid frontId
     * @param message
     */
    sendMessage(message, frontChannelId) {
        if (frontChannelId) {
            if (!(this.connectedFrontChannels.has(frontChannelId)))
                throw new Error(`Invalid frontChannelId:${frontChannelId} was not connected to backChannel: ${this.id}`);
            this.connectedFrontChannels.get(frontChannelId).send(message);
        }
        else {
            this._sendMessage(message);
        }
    }
    ;
    /**
     * returns all the keys in the connectedFrontChannels map
     */
    getConnectedFrontIds() {
        return Array.from(this.connectedFrontChannels.keys());
    }
    /**
     * called on subscriptions, use onMessage to register message handler.
     * @param message - data
     * @param fromFrontId - if we receive a message thats not from a sibling front channel
     * this field will contain data
     */
    onMessageHandler(message, fromFrontId) {
        throw new Error(`Unimplimented message handler in back channel ${this.id}`);
    }
    setState(stateData) {
        this._setState(stateData);
        this._onStateSet(stateData);
    }
    _onStateSet(stateData) {
        this.onSetState(stateData);
    }
    _onMessage(message, from) {
        this.onMessageHandler(message, from);
    }
    addFrontChannelConnection(frontId) {
        //todo maybe send a confirmation connect message for async or even an onFrontConnect hook.
        const name = `${PROTOCOLS.BACK_SEND}-${frontId}`;
        // channels share centrum instance so dont want to duplicate publish.
        if (!(this.centrum.publish[name])) {
            this.centrum.createPublish(name);
        }
        this.connectedFrontChannels.set(frontId, {
            send: this.centrum.publish[name]
        });
    }
    removeFrontChannelConnection(frontId) {
        this.connectedFrontChannels.delete(frontId);
        this.centrum.removePublish(`${protocol_1.PROTOCOL.BACK_SEND}-${frontId}`);
    }
    broadcastPatchHandler() {
    }
    sendStateHandler() {
        return this.state.data;
    }
    // back channels subscription can receive data that includes removed front states,
    // first we use this to remove states from the back before continuing to
    // process the updated front state.
    initializeCentrumSubscriptions() {
        // sends connect message to sibiling back channel.
        this.centrum.createSubscription(protocol_1.PROTOCOL.CONNECT, (frontId) => {
            this.addFrontChannelConnection(frontId);
        });
        // sends disconnect message to sibiling back channel.
        const disconnectMessageName = `${this.id}-${protocol_1.PROTOCOL.DISCONNECT}`;
        this.centrum.createSubscription(disconnectMessageName, (frontId) => {
            this.removeFrontChannelConnection(frontId);
        });
        const forwardQueuedMessagesPubName = `${this.id}-${protocol_1.PROTOCOL.FORWARD_QUEUED}`;
        this.centrum.createSubscription(forwardQueuedMessagesPubName, (data) => {
            for (let i = 0; i < data.length; i++) {
                this._onMessage(data[i]);
            }
        });
        // if front server wants to send message to all back channels
        // adds this subscription handler to every back channel.
        this.centrum.createSubscription(protocol_1.PROTOCOL.FRONT_TO_ALL_BACK, (data) => {
            this._onMessage(data.message, data.from);
        });
    }
    ;
    initializeCentrumPublications() {
        // front channels subscribe to back channel for JUST state data updates not removals since
        // the backState in a front channel just blindly takes shape each update from the sibling BackChannel
        const patchStatePubName = `${protocol_1.PROTOCOL.PATCH_STATE}-${this.id}`;
        this.centrum.createPublish(patchStatePubName, this.sendStateHandler.bind(this));
        this.sendState = this.centrum.publish[patchStatePubName].bind(this);
        const setStatePubName = `${protocol_1.PROTOCOL.SET_STATE}-${this.id}`;
        this.centrum.createPublish(setStatePubName, this.broadcastPatchHandler.bind(this));
        this.broadcastPatch = this.centrum.publish[setStatePubName].bind(this);
        // sends a message to all sibling front channels.
        const sendMessagePubName = `${protocol_1.PROTOCOL.BACK_SEND}-${this.id}`;
        this.centrum.createPublish(sendMessagePubName);
        this._sendMessage = this.centrum.publish[sendMessagePubName];
    }
    ;
}
exports.BackChannel = BackChannel;
