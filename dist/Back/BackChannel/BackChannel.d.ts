import { Messenger } from 'gotti-pubsub/dist/Messenger';
import { Channel } from '../../Channel/Channel';
import { BackMasterChannel } from '../BackMaster/MasterChannel';
import { ConnectedFrontData } from '../../types';
export declare class BackChannel extends Channel {
    private master;
    private pub;
    private sub;
    private push;
    private pull;
    private _connectedFrontsData;
    private _listeningClientUids;
    private _writingClientUids;
    private _mirroredFrontUids;
    state: any;
    _previousState: any;
    _previousStateEncoded: string;
    private linkedFrontAndClientUids;
    private linkedFrontUids;
    private masterIndexToFrontUidLookup;
    linkedFrontMasterIndexes: Array<number>;
    readonly backMasterIndex: number;
    constructor(channelId: any, messenger: Messenger, master: BackMasterChannel);
    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and frontUid
     */
    onMessage(handler: (message: any, frontUid: string, clientUid?: string) => void): void;
    /**
     * @param handler - handler called when a client is added as a writer.
     */
    onAddClientWrite(handler: (clientUid: string, options?: any) => void): void;
    /**
     * @param handler - handler called when a client is added as a writer.
     */
    onRemoveClientWrite(handler: (clientUid: string, options?: any) => void): void;
    /**
     * handler that is called when a client is linked to the back channel.
     * if it returns anything data it will be sent back to the front channel asynchronously
     * at index 2 with the currently encoded state at index 0 and the client uid at index 1.
     * @param handler
     */
    onAddClientListen(handler: (clientUid: string, options?: any) => any): void;
    /**
     * sets the onClientListenHandler function
     * @param handler - function that gets executed when a new client is succesfully linked/listening to state updates.
     */
    onRemoveClientListen(handler: (clientUid: string, options?: any) => void): void;
    /**
     * called when we receive a link request from the front with no client uid. This means
     * the front is just linking for a reason that doesnt include relaying data to clients.
     * @param frontUid
     */
    private acceptLink;
    /**
     * gets called when a link publish message is received and a new unique client
     * has been linked to given channel.
     * @param frontUid - unique front channel sending link request.
     * @param frontMasterIndex - front master index the client is connected to.
     * @param clientUid - uid of client.
     * @param options - additional options client passed upon link request
     */
    private acceptClientLink;
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
     * Sends message to all mirrored front channels that are currently linked.
     * @param message
     */
    broadcastLinked(message: any): void;
    /**
     * sets the previous encoded state in order to find the delta for next state update.
     * @param newState
     */
    setState(newState: any): void;
    /**
     * Function that's called from the back master when it receives queued messages
     * from a the front master server.
     * @param message
     * @param frontMasterIndex
     */
    processMessageFromMaster(message: any, frontMasterIndex: number, clientUid?: any): void;
    readonly connectedFrontsData: Map<string, ConnectedFrontData>;
    readonly mirroredFrontUids: Array<string>;
    readonly listeningClientUids: Array<string>;
    readonly writingClientUids: Array<string>;
    private _onMessage;
    private onMessageHandler;
    /**
     * subscriptions that we want to register before front channels start connecting.
     */
    private registerPreConnectedSubs;
    /**
     * publications that we want to be able to send out before channels start connecting.
     */
    private registerPreConnectedPubs;
    /**
     * initializes channel pub and sub  handlers when we receive a connect message from front channel.
     * @param frontData - { channelId, frontUid, frontMasterIndex }
     */
    private onMirrorConnected;
    /**
     * initializes needed message factories for front channels.
     */
    private initializeMessageFactories;
}
