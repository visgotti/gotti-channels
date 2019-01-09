import FrontChannel from './FrontChannel';
export declare class Client {
    readonly uid: string;
    state: any;
    private connectedChannels;
    private queuedEncodedUpdates;
    private processorChannel;
    constructor(uid: any);
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
    addEncodedStateSet(channelId: any, state: any): number | boolean;
    addEncodedStatePatch(channelId: any, patch: any): number | boolean;
    clearEncodedStateUpdates(): void;
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
