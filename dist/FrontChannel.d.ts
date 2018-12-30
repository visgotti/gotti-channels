import { Channel } from './Channel/Channel';
import { StateData } from './types';
import { Centrum } from '../../lib/Centrum';
export declare class FrontChannel extends Channel {
    private _backState;
    constructor(id: any, centrum: Centrum);
    onBackStateUpdate(callback: (stateData: StateData) => void): void;
    readonly backState: StateData;
}
