import { State, StateData, MSG_CODES } from '../types';
import { Centrum } from '../../../lib/Centrum';


export class Channel {
    readonly channelId: string;
    protected centrum: Centrum;

    private _state: State;

    constructor(channelId, centrum) {
        this.channelId = channelId;
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

    protected patchState(patches) : StateData {
        //this.channelState.patchState(patches);
        return this._state.data;
    }

    protected protocol(code: MSG_CODES, id?: string) : string {
        // in case we need custom logic for certain codes we can use switch statement.
        switch(code[i]) {
            default:
                return id ? `${code.toString()}-${id}` : code.toString();
        }
    }

    public close() {
        this.centrum.close();
    }
}