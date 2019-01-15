import { Channel } from '../../Channel/Channel';
import { FrontMasterChannel } from '../FrontMaster/MasterChannel';
import Client from '../../Client';
import { Messenger } from 'centrum-messengers/dist/core/Messenger';
declare class FrontChannel extends Channel {
    private master;
    private connectedChannelIds;
    private _connectionInfo;
    private pub;
    private sub;
    private push;
    private CONNECTION_STATUS;
    private linked;
    private connectedClients;
    private clientConnectedCallbacks;
    private clientConnectedTimeouts;
    private backMasterIndex;
    readonly frontUid: string;
    readonly frontMasterIndex: number;
    readonly totalChannels: number;
    readonly clientTimeout: number;
    constructor(channelId: any, totalChannels: any, messenger: Messenger, master: FrontMasterChannel);
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
    onConnected(handler: (backChannelId: any, backMasterIndex: any) => void): void;
    /**
     * sets the onPatchStateHHandler, the patch is not decoded or applied and its left for you to do that..
     * the reason for this is if you may not want to use cpu applying the patch and just want to forward it.
     * @param handler - function that gets executed after channel receives and applies patched state from .
     */
    onPatchState(handler: (patch: any) => void): void;
    patchState(patch: any): void;
    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and channelId
     */
    onMessage(handler: (message: any, channelId: string) => void): void;
    /**
     * sends a link message to mirror back channel to notify it that it needs to receive current state and then
     * receive patches and messages. if theres a client uid to initiate the link, the back server will respond with
     * the clientUid when it replies with state which gets used to call the callback in clientConnectedCallbacks map
     * returns back state asynchronously.
     */
    link(clientUid?: boolean): Promise<{}>;
    /**
     * sends an unlink message to back channel so it stops receiving patch updates
     */
    unlink(): void;
    /**
     * adds message to queue to master which gets sent to needed back master at a set interval.
     * @param message
     */
    addMessage(message: any): void;
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
    readonly connectionInfo: any;
    private _connectClient;
    private emitClientLinked;
    disconnectClient(clientUid: any): void;
    private _onPatchState;
    private onPatchStateHandler;
    private _onMessage;
    private onMessageHandler;
    private _onConnectionChange;
    /**
     * registers needed pub and subs when connected and runs handler passed into onConnected(optional)
     * if its the same channelId
     * @param backChannelId
     * @param backMasterIndex - index of the Back Channel's master.
     */
    private _onConnected;
    private onConnectedHandler;
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
