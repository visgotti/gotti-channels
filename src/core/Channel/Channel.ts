const EventEmitter = require('events');

import { Messenger } from '../../../lib/core/Messenger';

export class Channel extends EventEmitter{
    readonly channelId: string;
    readonly serverId: string;
    protected messenger: Messenger;

    constructor(channelId, messenger) {
        super();
        this.channelId = channelId;
        this.messenger = messenger;
        this.serverId = messenger.serverId;
    }

    public close() {
        this.messenger.close();
    }
}