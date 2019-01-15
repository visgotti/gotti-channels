import { STATE_UPDATE_TYPES } from './types';
import FrontChannel from './Front/FrontChannel';
declare class Client {
    readonly uid: string;
    state: any;
    private connectedChannels;
    private processorChannel;
    private _queuedEncodedUpdates;
    constructor(uid: any);
    readonly queuedEncodedUpdates: any;
    /**
     * Sets connected channel of client also links it.
     * @param channel
     */
    connectToChannel(channel: FrontChannel): Promise<{}>;
    /**
     * this sets the channel where client messages get processed.
     * if the client isnt connected, it will call the connect method first.
     * @param channel
     */
    setProcessorChannel(channel: FrontChannel): Promise<boolean>;
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
