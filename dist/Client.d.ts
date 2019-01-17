import { STATE_UPDATE_TYPES } from './types';
import { FrontMasterChannel } from './Front/FrontMaster/MasterChannel';
declare class Client {
    readonly uid: string;
    state: any;
    private masterChannel;
    private linkedChannels;
    private _processorChannel;
    private _queuedEncodedUpdates;
    constructor(uid: string, masterChannel: FrontMasterChannel);
    readonly queuedEncodedUpdates: any;
    readonly processorChannel: string;
    isLinkedToChannel(channelId: string): boolean;
    /**
     * method to be overridden to handle direct client messages from back channels.
     */
    onMessage(handler: any): void;
    onMessageHandler(message: any): void;
    /**
     * Sets connected channel of client also links it.
     * @param channelId
     * @param options to send to back channel
     */
    linkChannel(channelId: string, options?: any): Promise<any>;
    /**
     * setProcessorChannel will set the channel in which a client will relay its messages through.
     * The processor channel will forward the clients messages to the mirrored back channel in which
     * it will process the message and wind up sending back messages/state updates to any linked clients.
     * @param {string} channelId - channelId to set as processor channel.
     * @param {boolean=false} unlinkOld - if you want to unlink from the old processor channel after you set the new one.
     * @param {any} addOptions - options that get sent to the new processor channel
     * @param {any} removeOptions - options that get sent to the old processor channel
     * @returns {boolean}
     */
    setProcessorChannel(channelId: string, unlinkOld?: boolean, addOptions?: any, removeOptions?: any): boolean;
    addStateUpdate(channelId: any, update: any, type: STATE_UPDATE_TYPES): any;
    clearStateUpdates(): void;
    /**
     * Message that will be received by every server.
     * @param message
     */
    sendGlobal(message: any): void;
    /**
     * sends message to back channel with processorId.
     * @param message
     */
    sendLocal(message: any): void;
    unlinkChannel(channelId?: any, options?: any): void;
    onChannelDisconnect(channelId: any): void;
}
export default Client;
