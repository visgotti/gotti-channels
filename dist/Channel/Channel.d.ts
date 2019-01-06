declare const EventEmitter: any;
import { State, StateData } from '../types';
import { Centrum } from '../../../lib/Centrum';
export declare class Channel extends EventEmitter {
    readonly channelId: string;
    protected centrum: Centrum;
    private _state;
    constructor(channelId: any, centrum: any);
    readonly state: State;
    protected _setState(newState: StateData): void;
    protected patchState(patches: any): StateData;
    close(): void;
}
export {};
