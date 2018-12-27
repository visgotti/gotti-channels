import { Channel, ChannelType } from './base/Channel';
import { StateData } from './base/ChannelState';

import { Centrum } from '../../lib/Centrum';

export class FrontChannel extends Channel {
    constructor(id, centrum: Centrum) {
        super(id, centrum, ChannelType.FRONT);
    }
    public onBackStateUpdate(callback: (stateData: StateData) => void) {
        this._onStateUpdate = callback
    }
}