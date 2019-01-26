import { Channel } from '../../Channel/Channel';
import { FrontMasterChannel } from '../FrontMaster/MasterChannel';
import Client from '../../Client';
import { Messenger } from 'gotti-pubsub/dist';
export declare class FrontChannel extends Channel {
    private master;
    private messenger;
    private connectedChannelIds;
    private _connectionInfo;
    private pub;
    private sub;
    private push;
    private CONNECTION_STATUS;
    private linked;
    private linkedClients;
    listeningClientUids: Array<string>;
    private clientLinkTimeouts;
    private backMasterIndex;
    readonly frontUid: string;
    readonly frontMasterIndex: number;
    readonly totalChannels: number;
    readonly clientTimeout: number;
    constructor(channelId: any, totalChannels: any, messenger: Messenger, master: FrontMasterChannel);
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
    onMessage(handler: (data: any) => void): void;
    /**
     * Sends link 'request' to back channel. It will respond with the back channel's current
     * state asynchronously, if we call link with a clientUid it will behave the same but
     * the parameter will be kept in a lookup on the back master so it can keep track of which
     * front master a client lives on. This allows the ability to send direct messages to the client
     * from the back.
     * @param client - Centrum client instance
     * @param options (optional) if you want to send data as a client connects
     * @returns {Promise<T>}
     */
    linkClient(client: Client, options?: any): Promise<any>;
    /**
     * sends unlink message, it will decrement or remove the client lookup data on the back,
     * the back channel checks if there are any clients left with a link to the front master
     * and if not it will stop keeping track of it until it receives another link.
     * @param clientUid
     */
    unlinkClient(clientUid: string, options?: any): void;
    /**
     * sends notification to mirror back channel that it will be receiving messages
     * from client to process.
     * @param clientUid
     * @param options
     */
    addClientWrite(clientUid: string, options?: any): void;
    /**
     * sends notification to mirror back channel that it will no longer
     * be receiving messages from client.
     * @param clientUid
     * @param options
     */
    removeClientWrite(clientUid: string, options?: any): void;
    /**
     * adds message to the front master's message queue. These queue up and will then send
     * to the appropriate back master at a set interval, where upon reaching the back master,
     * the back master will iterate through the messages received and dispatch them to the child
     * back channels to process.
     * @param message
     * @param clientUid that's used for protocol check if its from a clientUid or not.
     */
    addMessage(data: Array<any>, clientUid?: string): void;
    /**
     * sends message to mirror back channel by default if backChannelId is omitted or sends to remote back channel with specified id.
     * @param message - data sent to back channel.
     * @param backChannelId - id of back channel to send message to
     * @param fromClient - optional parameter that allows the back channel to know if
     * the message was sent by a client by checking if last element is null or not
     */
    send(data: Array<any>, backChannelId?: string, fromClient?: string): void;
    /**
     * sends message to all specified backChannelIds, if omitted it will send broadcast to all connected remote and mirror back channels.
     * @param message
     * @param backChannelIds
     * @param fromClient - optional parameter that allows the back channel to know if the message was sent by a client
     */
    broadcast(data: Array<any>, backChannelIds?: Array<string>, fromClient?: string): void;
    /**
     * sends out a connection publication then as back channels reply with a connect success publication keeps track and
     * when all replied the promise gets resolved and the connection timeout gets cleared.
     * @param timeout - time in milliseconds to wait for all back channels to reply before throwing an error.
     */
    connect(timeout?: number): Promise<{}>;
    readonly connectionInfo: any;
    private emitClientLinked;
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
     * @param options - options set on back channel to share with front channel on connection
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
    private clientCanLink;
}
