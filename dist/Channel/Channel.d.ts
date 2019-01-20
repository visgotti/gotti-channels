declare const EventEmitter: any;
import { Messenger } from 'gotti-pubsub/dist/Messenger';
export declare class Channel extends EventEmitter {
    readonly channelId: string;
    readonly serverId: string;
    protected messenger: Messenger;
    constructor(channelId: any, messenger: any);
}
export {};
