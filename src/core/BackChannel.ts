import { Channel, ChannelType } from './base/Channel';
import { StateData } from './base/ChannelState';

import { Centrum } from '../../lib/Centrum';

export class BackChannel extends Channel {
    constructor(id, centrum: Centrum) {
        super(id, centrum, ChannelType.BACK);
    }
    public onFrontStateUpdate(callback: (stateData: StateData) => void) {
        this._onStateUpdate = callback
    }
}