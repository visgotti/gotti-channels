"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter = require('events');
class Channel extends EventEmitter {
    constructor(channelId, centrum) {
        super();
        this.channelId = channelId;
        this.centrum = centrum;
        this.serverId = centrum.serverId;
        this._state = {
            data: {},
        };
    }
    get state() {
        return this._state;
    }
    _setState(newState) {
        this._state.data = newState;
    }
    patchState(patches) {
        //this.channelState.patchState(patches);
        return this._state.data;
    }
    close() {
        this.centrum.close();
    }
}
exports.Channel = Channel;
