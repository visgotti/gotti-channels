import { Channel } from '../../Channel/Channel';
export declare class FrontMasterChannel extends Channel {
    private sub;
    private push;
    private frontChannelIds;
    private _linkedBackMasterLookup;
    private _linkedBackMasterIndexes;
    private _connectedBackMasters;
    private _connectedClients;
    frontChannels: any;
    readonly frontMasterIndex: any;
    constructor(frontMasterIndex: any);
    initialize(masterURI: any, backMasterURIs: Array<string>): void;
    addChannels(channelIds: any): void;
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
     * @param data - message to send
     * @param channel id - used as the last element in index to allow for back master to dispatch correctly. always last index
     * @param backMasterIndex - server index that the linked back channel lives on.
     * @param fromClient - allows back channel to know if it was a client message by checking second to
     * last index when receiving queuedMessages
     */
    addQueuedMessage(data: Array<any>, channelId: any, backMasterIndex: any, fromClient?: string): void;
    unlinkChannel(backMasterIndex: any): void;
    linkChannel(backMasterIndex: any): void;
    private updateLinkedBackMasterIndexArray;
    readonly linkedBackMasterLookup: {
        linkedChannelsCount: number;
        queuedMessages: any[];
    };
    /**
     * initializes needed message factories for front channels.
     */
    private initializeMessageFactories;
    disconnect(): void;
}
