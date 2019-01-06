import { Channel } from './Channel/Channel';
import { Centrum } from '../../lib/Centrum';
import { StateData } from './types';
export declare class FrontChannel extends Channel {
    forwardMessages: Function;
    private connectedChannelIds;
    private channelMessageHandlers;
    private sendQueuedHandler;
    private broadcastAllHandler;
    private connectHandler;
    private queuedMessages;
    readonly frontUid: string;
    readonly frontServerIndex: number;
    readonly backChannels: number;
    constructor(channelId: any, frontServerIndex: any, backChannels: any, centrum: Centrum);
    /**
     * sets the setStateHandler function
     * @param handler - function that gets executed when mirror back channel sends whole state
     */
    onSetState(handler: (newState: StateData) => void): void;
    /**
     * sets the patchStateHandler function
     * @param handler - function that gets executed after channel receives and applies patched state from .
     */
    onPatchState(handler: (patches: any, updatedState: StateData) => void): void;
    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and channelId
     */
    onMessage(handler: (message: any, channelId: string) => void): void;
    /**
     * adds message to queue to be sent to mirror back channel when broadcastQueued() is called.
     * @param message
     * @returns number - length of queued messages
     */
    addMessage(message: any): number;
    /**
     * used to publish all queued messages to mirror back channel queuedMessages is emptied when called.
     */
    sendQueued(): void;
    /**
     * sends message to mirror back channel by default if backChannelId is omitted or sends to remote back channel with specified id.
     * @param message - data sent to back channel.
     * @param backChannelId - id of back channel to send message to
     */
    send(message: any, backChannelId?: string): void;
    /**
     * sends message to all specified backChannelIds, if omitted it will send broadcast to all connected remote and mirror back channels.
     * @param message
     * @param backChannelIds
     */
    broadcast(message: any, backChannelIds?: Array<string>): void;
    /**
     * sends out a connection publication then as back channels reply with a connect success publication keeps track and
     * when all replied the promise gets resolved and the connection timeout gets cleared.
     * @param timeout - time in milliseconds to wait for all back channels to reply before throwing an error.
     */
    connect(timeout?: number): Promise<void>;
    private _onSetState;
    private onSetStateHandler;
    private _onPatchState;
    private onPatchedStateHandler;
    private _onMessage;
    private onMessageHandler;
    disconnect(channelId: string): void;
    /**
     * subscriptions that we want to register pre connection.
     */
    private initializePreConnectSubs;
    /**
     * Publications we initialize before connections are made.
     */
    private initializePreConnectedPubs;
    /**
     * initializes centrum pub and subs when connected
     * @param backChannelId
     */
    private onConnected;
}
