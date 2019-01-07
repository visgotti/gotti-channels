const EventEmitter = require('events');

import { Centrum } from '../../../lib/core/Centrum';

export class Channel extends EventEmitter{
    readonly channelId: string;
    readonly serverId: string;
    protected centrum: Centrum;

    constructor(channelId, centrum) {
        super();
        this.channelId = channelId;
        this.centrum = centrum;
        this.serverId = centrum.serverId;
    }

    public close() {
        this.centrum.close();
    }
}