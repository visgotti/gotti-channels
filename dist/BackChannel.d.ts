import { Channel } from './Channel/Channel';
import { StateData } from './types';
import { Centrum } from '../../lib/Centrum';
export declare class BackChannel extends Channel {
    constructor(id: any, centrum: Centrum);
    onFrontStateUpdate(callback: (stateData: StateData) => void): void;
}
