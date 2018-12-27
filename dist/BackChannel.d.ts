import { Channel } from './base/Channel';
import { StateData } from './base/ChannelState';
import { Centrum } from '../../lib/Centrum';
export declare class BackChannel extends Channel {
    constructor(id: any, centrum: Centrum);
    onFrontStateUpdate(callback: (stateData: StateData) => void): void;
}
