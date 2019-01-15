import { STATE_UPDATE_TYPES } from './types';
import { FrontMasterChannel } from './Front/FrontMaster/MasterChannel';
declare class Client {
    readonly uid: string;
    state: any;
    private masterChannel;
    private connectedChannels;
    private processorChannel;
    private _queuedEncodedUpdates;
    constructor(uid: string, masterChannel: FrontMasterChannel);
    readonly queuedEncodedUpdates: any;
    /**
     * method to be overridden to handle direct client messages from back channels.
     */
    onMessage(handler: any): void;
    onMessageHandler(message: any): void;
    /**
     * Sets connected channel of client also links it.
     * @param channelId
     */
    connectToChannel(channelId: string): Promise<any>;
    /**
     * this sets the channel where client messages get processed.
     * if the client isnt connected, it will call the connect method first.
     * @param channel
     */
    setProcessorChannel(channelId: string): Promise<boolean>;
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
    disconnect(channelId?: any): void;
    onChannelDisconnect(channelId: any): void;
}
export default Client;
