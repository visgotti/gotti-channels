import { State, StateData, StateDatum } from '../types';

export class ChannelState {
    private _state: State;

    constructor() {
        this._state = {
            data: {} as StateData,
        };
    }

    get state() {
        return this._state;
    }

    /**
     * Used to completely rewrite state
     * @param newState
     */
    public setState(newState: StateData) {
        this._state.data = newState;
    }

    /**
     * Used to change the state
     */
    public patchState(patches: any) {

    }
}
