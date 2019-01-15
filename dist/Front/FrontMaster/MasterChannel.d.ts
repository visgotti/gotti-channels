import { Messenger } from 'centrum-messengers/dist/core/Messenger';
import { Channel } from '../../Channel/Channel';
export declare class FrontMasterChannel extends Channel {
    private pull;
    private push;
    private frontChannelIds;
    private _linkedBackMasterLookup;
    private _connectedBackMasters;
    frontChannels: any;
    readonly frontMasterIndex: any;
    constructor(channelIds: any, totalChannels: any, frontMasterIndex: any, messenger: Messenger);
    readonly connectedBackMasters: number[];
    connect(): Promise<boolean>;
    sendQueuedMessages(): void;
    /**
     * adds a message to the queue for a specific back Master Channel
     * @param message - message to send
     * @param backMasterIndex - server index that the linked back channel lives on.
     */
    addQueuedMessage(message: any, backMasterIndex: any, channelId: any): void;
    unlinkChannel(backMasterIndex: any): void;
    linkChannel(backMasterIndex: any): void;
    readonly linkedBackMasterLookup: {
        linkedChannelsCount: number;
        queuedMessages: any[];
    };
    /**
     * initializes needed message factories for front channels.
     */
    private initializeMessageFactories;
    close(): void;
}
