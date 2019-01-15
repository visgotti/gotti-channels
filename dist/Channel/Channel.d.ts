declare const EventEmitter: any;
import { Messenger } from 'centrum-messengers/dist/core/Messenger';
export declare class Channel extends EventEmitter {
    readonly channelId: string;
    readonly serverId: string;
    protected messenger: Messenger;
    constructor(channelId: any, messenger: any);
    close(): void;
}
export {};