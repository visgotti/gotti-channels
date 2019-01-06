"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fossilDelta = require("fossil-delta");
const msgpack = require("notepack.io");
class Client {
    constructor(uid) {
        this.uid = uid;
        this.connectedChannel = null;
        this.state = null;
        this._previousStateEncoded = {};
    }
    addMessage(message) {
        if (!(this.connectChannel)) {
            throw new Error('Client must be connected to a channel to add messages.');
        }
        const data = {
            uid: this.uid,
            message,
        };
        this.connectedChannel.addMessage(data);
    }
    /**
     * Sets connected channel of client also links it.
     * @param channel
     */
    connectChannel(channel) {
        this.linkChannel(channel);
        this.connectedChannel = channel;
    }
    /**
     * adds linkage of client to a channel state.
     * @param channel
     */
    linkChannel(channel) {
        this.state[channel.id] = channel.state;
    }
    /**
     * unlinks back channel updates for specific channel.
     * @param channelId
     */
    unlinkChannel(channelId) {
        delete this.state[channelId];
    }
    patchState() {
        const currentState = this.state;
        const currentStateEncoded = msgpack.encode(currentState);
        // skip if state has not changed.
        if (currentStateEncoded.equals(this._previousStateEncoded)) {
            return false;
        }
        const patches = fossilDelta.create(this._previousStateEncoded, currentStateEncoded);
        this._previousStateEncoded = currentStateEncoded;
        return patches;
    }
    get previousStateEncoded() {
        return this._previousStateEncoded;
    }
}
exports.Client = Client;
