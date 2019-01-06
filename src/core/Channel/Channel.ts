const EventEmitter = require('events');

import { State, StateData } from '../types';
import { Centrum } from '../../../lib/Centrum';

export class Channel extends EventEmitter{
    readonly channelId: string;
    readonly serverId: string;
    protected centrum: Centrum;

    private _state: State;

    constructor(channelId, centrum) {
        super();
        this.channelId = channelId;
        this.centrum = centrum;
        this.serverId = centrum.serverId;
        this._state = {
            data: {} as StateData,
        };
    }

    get state () : State {
        return this._state;
    }

    protected _setState (newState: StateData) {
        this._state.data = newState;
    }

    protected patchState(patches) : StateData {
        //this.channelState.patchState(patches);
        return this._state.data;
    }

    public close() {
        this.centrum.close();
    }
}