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
     * used to update a particular key of the state
     * @param newData
     * @param key
     */
    public updateState(newData: StateDatum, key: string) {
        this._state.data[key] = newData;
    }

    /**
     * removes key of state
     * @param key
     */
    public removeState(key: string) {
        delete this._state.data[key];
    }
}
