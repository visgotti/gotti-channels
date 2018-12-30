"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ClientState_1 = require("./ClientState");
class Client {
    constructor(uid) {
        this.uid = uid;
        this.connectedChannel = null;
        this.linkedBackState = {};
        this.state = new ClientState_1.ClientState();
    }
    /**
     * Sets connected channel of client also links it.
     * @param channel
     */
    connectChannel(channel) {
        if (this.connectedChannel) {
            this.connectedChannel.removeState(this.uid);
        }
        this.linkChannel(channel);
        this.connectedChannel = channel;
    }
    /**
     * Updates the client's state and also updates
     * it inside the client's connectedChannel to relay
     * to the backChannel.
     * @param newState
     */
    setState(newState) {
        this.state.data = newState;
        this.connectedChannel.setState(newState, this.uid);
    }
    /**
     * adds linkage to a front channel's BackChannel sibling state.
     * @param channel
     */
    linkChannel(channel) {
        this.linkedBackState[channel.id] = channel.backState;
    }
    /**
     * unlinks back channel updates for specific channel.
     * @param channelId
     */
    unlinkChannelState(channelId) {
        delete this.linkedBackState[channelId];
    }
    /**
     * Returns all the linked channel states the client needs
     * @returns {StateLookup}
     */
    getLinkedStates() {
        console.log('the linked back state was', this.linkedBackState);
        console.log('the connectedChannel back state tho was', this.connectedChannel.backState);
        return this.linkedBackState;
    }
    getState() {
        return this.state.data;
    }
}
exports.Client = Client;
