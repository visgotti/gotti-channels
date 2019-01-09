import { Channel } from '../Channel/Channel';
import { Client } from '../Client';
import { Messenger } from '../../../lib/core/Messenger';
declare class FrontChannel extends Channel {
    private connectedChannelIds;
    private _connectionInfo;
    private queuedMessages;
    private pub;
    private sub;
    private push;
    private _state;
    private CONNECTION_STATUS;
    private linked;
    private connectedClients;
    private clientConnectedCallbacks;
    private clientConnectedTimeouts;
    readonly frontUid: string;
    readonly serverIndex: number;
    readonly totalChannels: number;
    readonly clientTimeout: number;
    constructor(channelId: any, serverIndex: any, totalChannels: any, messenger: Messenger);
    /**
     *
     * @param client
     * @param timeout
     */
    connectClient(client: Client, timeout?: any): Promise<{}>;
    /**
     * sets the onConnectedHandler function
     * @param handler - function that gets executed when a channel succesfully connects to a backChannel.
     */
    onConnected(handler: (backChannelId: any, state?: any) => void): void;
    /**
     * sets the setStateHandler function, the state is not decoded for same reason as the patches
     * are not. you may want to just blindly pass it along and not waste cpu decoding it.
     * @param handler - function that gets executed when mirror back channel sends whole state
     */
    onSetState(handler: (encodedState: any, clientUid?: any) => void): void;
    /**
     * sets the onPatchStateHHandler, the patch is not decoded or applied and its left for you to do that..
     * the reason for this is if you may not want to use cpu applying the patch and just want to forward it.
     * @param handler - function that gets executed after channel receives and applies patched state from .
     */
    onPatchState(handler: (patches: any) => void): void;
    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and channelId
     */
    onMessage(handler: (message: any, channelId: string) => void): void;
    /**
     * sends a link message to mirror back channel to notify it that it needs to receive current state and then
     * receive patches and messages. if theres a client uid to initiate the link, the back server will respond with
     * the clientUid when it replies with state which gets used to call the callback in clientConnectedCallbacks map
     */
    link(clientUid?: boolean): void;
    /**
     * sends an unlink message to back channel so it stops receiving patch updates
     */
    unlink(): void;
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
    connect(timeout?: number): Promise<{}>;
    /**
     * Either disconnects from given channel ids or by default disconnects from all.
     * @param channelIds - Channel Ids to disconnect from.
     * @param timeout - wait time to finish all disconnections before throwing error.
     * @returns {Promise<T>}
     */
    disconnect(channelIds?: Array<string>, timeout?: number): Promise<{}>;
    clearQueued(): void;
    readonly state: any;
    readonly connectionInfo: any;
    private _connectClient;
    disconnectClient(clientUid: any): void;
    private disconnectAllClients;
    private _onSetState;
    /**
     * received full state from back channel, check if its for
     * a client awaiting for its connected callback and then
     * check if the client is in the connected map
     * @param clientUid
     * @param state
     */
    private handleSetStateForClient;
    private onSetStateHandler;
    private _onPatchState;
    private onPatchStateHandler;
    private _onMessage;
    private onMessageHandler;
    private _onConnectionChange;
    /**
     * registers needed pub and subs when connected and runs handler passed into onConnected(optional)
     * if its the same channelId
     * @param backChannelId
     * @param state - if its the mirrored channelId, it will have the current state as well.
     */
    private _onConnected;
    private onConnectedHandler;
    private onDisconnected;
    private validateConnectAction;
    /**
     * subscriptions that we want to register pre connection.
     */
    private registerPreConnectedSubs;
    /**
     * Publications we initialize before connections are made.
     */
    private registerPreConnectedPubs;
    /**
     * initializes needed message factories for front channels.
     */
    private initializeMessageFactories;
    private clientCanConnect;
}
export default FrontChannel;
