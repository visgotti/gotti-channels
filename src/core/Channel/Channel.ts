import { State, StateData } from '../types';
import { Centrum } from '../../../lib/Centrum';

export enum ChannelType {
    BACK = "BACK",
    FRONT = "TYPE"
}

export class Channel {

    readonly id: string;
    protected centrum: Centrum;

    private _state: State;

    constructor(id, centrum) {
        this.id = id;
        this.centrum = centrum;
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

    protected patchState(patches) {
        //this.channelState.patchState(patches);
    }

    public close() {
        this.centrum.close();
    }
}