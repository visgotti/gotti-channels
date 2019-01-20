import { Messenger } from 'gotti-pubsub/dist/Messenger';
import { Channel } from '../../Channel/Channel';
export declare class BackMasterChannel extends Channel {
    private pull;
    private push;
    private _linkedFrontMasterIndexesArray;
    private _linkedFrontMasterChannels;
    private _connectedFrontMasters;
    private backChannelsArray;
    private _linkedClientFrontDataLookup;
    backChannels: any;
    sendStateRate: number;
    private _sendStateUpdatesInterval;
    readonly backMasterIndex: any;
    constructor(channelIds: any, backMasterIndex: any, messenger: Messenger);
    readonly linkedClientFrontDataLookup: Map<string, {
        linkCount: number;
        frontMasterIndex: number;
    }>;
    readonly linkedFrontMasterChannels: {
        linkedChannelsCount: number;
        encodedPatches: any[];
    };
    readonly linkedFrontMasterIndexesArray: number[];
    readonly connectedFrontMasters: number[];
    /**
     * Adds a patch to be sent to front masters that are linked. Then the front master will
     * apply it to the channels which need it.
     * @param frontMasterIndexes - indexes that need the patch.
     * @param patchData - patch data that is an encoded array with the channelId as the first element and the patch data as second.
     */
    addStatePatch(frontMasterIndexes: any, patchData: any): void;
    /**
     * patches state of channels which populates the linkedFrontMasterChannels lookup with an array
     * of encoded patches and sends to based on which channelIds that front master needs.
     */
    sendStatePatches(): void;
    /**
     * sends direct message to client from the back. Data of the client is kept in the _linkedClientFrontDataLookup
     * and is updates when we handle new unlink/link publications from the front channel when the message
     * is supplied with a clientUid notifying that the link/unlink was for a client.
     * @param clientUid - uid of client to send direct message to
     * @returns {boolean}
     */
    messageClient(clientUid: any, data: Array<any>): boolean;
    private handleNewFrontMasterConnection;
    onChannelConnection(frontMasterIndex: number): void;
    linkedChannelFrom(frontMasterIndex: number): void;
    unlinkedChannelFrom(frontMasterIndex: any): void;
    /**
     * adds client to data lookup if its new, otherwise it adds to the listener count.
     * @param clientUid - identifier of client who is listening to one of the channels on current master
     * @param frontMasterIndex - front master index of where the client lives.
     */
    addedClientLink(clientUid: string, frontMasterIndex: number): void;
    /**
     * decrements the linkCount for given client and if it reaches 0
     * it is removed completely from the lookup.
     * @param clientUid
     */
    removedClientLink(clientUid: string): void;
    /**
     * sets an interval for sending the child state patches automatically.
     * @param milliseconds
     */
    setStateUpdateInterval(milliseconds?: number): void;
    clearSendStateInterval(): void;
    /** messageQueueData is formatted incoming as
     *  [data.... clientUid?, channelId always last element ]
     */
    private handleQueuedMessages;
    /**
     * initializes needed message factories for front channels.
     */
    private initializeMessageFactories;
    disconnect(): void;
}
