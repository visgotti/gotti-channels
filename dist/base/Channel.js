"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ChannelState_1 = require("./ChannelState");
var ChannelType;
(function (ChannelType) {
    ChannelType["BACK"] = "BACK";
    ChannelType["FRONT"] = "TYPE";
})(ChannelType = exports.ChannelType || (exports.ChannelType = {}));
class Channel {
    constructor(id, centrum, channelType) {
        this.id = id;
        this.centrum = centrum;
        // depending on the type of channel it is, these will be inversed.
        // we want to subscribe to front if back, and subscribe to back if we're front.
        this.publishStateFunctionName = channelType === ChannelType.BACK ?
            ChannelType.BACK + this.id :
            ChannelType.FRONT + this.id;
        this.subscribeStateName = channelType === ChannelType.BACK ?
            ChannelType.FRONT + this.id :
            ChannelType.BACK + this.id;
        this.state = new ChannelState_1.ChannelState();
        this.initializeCentrumMessengers();
    }
    initializeCentrumMessengers() {
        // front channels subscribe to back channel for state updates.
        this.centrum.createSubscription(this.subscribeStateName, (state) => {
            this._onStateUpdate(state);
        });
        this.centrum.createPublish(this.publishStateFunctionName, this.getState.bind(this));
        this.broadcastState = this.centrum.publish[this.publishStateFunctionName];
    }
    _onStateUpdate(stateData) {
        throw new Error(`Unimplemented onStateUpdate handler in channel`);
    }
    setState(newState) {
        this.state.data = newState;
    }
    getState() {
        return this.state.data;
    }
}
exports.Channel = Channel;
