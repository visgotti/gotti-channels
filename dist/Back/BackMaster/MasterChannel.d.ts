import { Messenger } from 'centrum-messengers/dist/core/Messenger';
import { Channel } from '../../Channel/Channel';
export declare class BackMasterChannel extends Channel {
    private pull;
    private push;
    private _linkedFrontMasterIndexesArray;
    private _linkedFrontMasterChannels;
    private _connectedFrontMasters;
    private backChannelIds;
    backChannels: any;
    readonly backMasterIndex: any;
    constructor(channelIds: any, backMasterIndex: any, messenger: Messenger);
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
     * @param encodedPatchData - patch data that is an encoded array with the channelId as the first element and the patch data as second.
     */
    addStatePatch(frontMasterIndexes: any, patchData: any): void;
    sendStatePatches(): void;
    private handleNewFrontMasterConnection;
    onChannelConnection(frontMasterIndex: any): void;
    linkedChannelFrom(frontMasterIndex: any): void;
    unlinkedChannelFrom(frontMasterIndex: any): void;
    /** messageQueueData is formatted incoming as
     *  [ channelId,  message  ]
     */
    private handleQueuedMessages;
    /**
     * initializes needed message factories for front channels.
     */
    private initializeMessageFactories;
    close(): void;
}
