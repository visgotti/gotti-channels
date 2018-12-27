import { Channel } from './base/Channel';
import { StateData } from './base/ChannelState';
import { Centrum } from '../../lib/Centrum';
export declare class FrontChannel extends Channel {
    constructor(id: any, centrum: Centrum);
    onBackStateUpdate(callback: (stateData: StateData) => void): void;
}
