const EventEmitter = require('events');

import { Messenger } from 'gotti-pubsub/dist';

export class Channel extends EventEmitter{
    readonly channelId: string;

    constructor(channelId) {
        super();
        this.channelId = channelId;
    }
}