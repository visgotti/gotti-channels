import { Centrum } from '../../lib/Centrum';
import { Channel } from './Channel/Channel';
export declare class BackChannel extends Channel {
    private channelMessageHandlers;
    private broadcastAllHandler;
    private broadcastMirrorHandler;
    private sendSetStateHandler;
    private sendPatchedStateHandler;
    private frontServerLookup;
    constructor(channelId: any, centrum: Centrum);
    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and frontUid
     */
    onMessage(handler: (message: any, frontUid: string) => void): void;
    broadcastPatchedState(): void;
    broadcastSetState(): void;
    /**
     * sends message to specific front channel based on frontUid
     * @param message - data sent to back channel.
     * @param frontUid - uid of front channel to send message to
     */
    send(message: any, frontUid: string): void;
    /**
     * sends message to supplied front channels based on frontUids or if omitted broadcasts to all front channels regardless of channel Id.
     * @param message
     * @param frontUids
     */
    broadcast(message: any, frontUids?: Array<string>): void;
    /**
     * sends message to all front channels that share channelId with back channel.
     * @param message
     * @param frontUids
     */
    broadcastMirrored(message: any): void;
    private onMessageQueue;
    private _onMessage;
    private onMessageHandler;
    /**
     * subscriptions that we want to register before front channels start connecting.
     */
    private initializePreConnectSubs;
    /**
     * publications that we want to be able to send out before channels start connecting.
     */
    private initializePreConnectPubs;
    /**
     * initializes channel pub and sub  handlers when we receive a connect message from front channel.
     * @param frontData - { channelId, frontUid, frontServerIndex }
     */
    private onFrontChannelConnected;
}
