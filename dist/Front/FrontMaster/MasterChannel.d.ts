import { Messenger } from 'centrum-messengers/dist/core/Messenger';
import { Channel } from '../../Channel/Channel';
export declare class FrontMasterChannel extends Channel {
    private sub;
    private push;
    private frontChannelIds;
    private _linkedBackMasterLookup;
    private _connectedBackMasters;
    private _connectedClients;
    frontChannels: any;
    readonly frontMasterIndex: any;
    constructor(channelIds: any, totalChannels: any, frontMasterIndex: any, messenger: Messenger);
    readonly connectedBackMasters: number[];
    connect(): Promise<boolean>;
    /**
     * Gets called in client when initialized
     * @param client
     */
    clientConnected(client: any): void;
    /**
     * called in client when disconnect is called
     * @param uid
     * @returns {boolean}
     */
    clientDisconnected(uid: any): boolean;
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
