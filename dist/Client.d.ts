import { FrontChannel } from './FrontChannel';
export declare class Client {
    readonly uid: string;
    state: any;
    private connectedChannel;
    private _previousState;
    private _previousStateEncoded;
    constructor(uid: any);
    addMessage(message: any): void;
    /**
     * Sets connected channel of client also links it.
     * @param channel
     */
    connectChannel(channel: FrontChannel): void;
    /**
     * adds linkage of client to a channel state.
     * @param channel
     */
    linkChannel(channel: FrontChannel): void;
    /**
     * unlinks back channel updates for specific channel.
     * @param channelId
     */
    unlinkChannel(channelId: string): void;
    patchState(): any;
    readonly previousStateEncoded: any;
}
