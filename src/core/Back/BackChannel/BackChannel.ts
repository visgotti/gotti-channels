import * as fossilDelta from 'fossil-delta';
import * as msgpack from 'notepack.io';

import { Messenger } from 'gotti-pubsub/dist';

import { Channel } from '../../Channel/Channel';
import { BackMessages, BackPubs, BackPushes, BackSubs, BackPulls } from './BackMessages';
import { BackMasterChannel } from '../BackMaster/MasterChannel';

import { ConnectedFrontData, CONNECTION_STATUS } from '../../types';

export class BackChannel extends Channel {
    private master: BackMasterChannel;

    private messenger: Messenger;

    private _connectionOptions: any = {};
    private setConnectionOptions: boolean = false;
    private pub: BackPubs;
    private sub: BackSubs;
    private push: BackPushes;
    private pull: BackPulls;

    // lookup of frontUid to frontMasterIndex
    private _connectedFrontsData: Map<string, ConnectedFrontData>;

    private _listeningClientUids: Set<string>;
    private _writingClientUids: Set<string>;


    // frontUid of first connected mirror front channel, used
    // for when a back channel wants to relay messages to other
    // back channels it will do so through this front channel.
    private mainFrontUid: string;

    private _mirroredFrontUids: Set<string>;

    public state: any;
    public _previousState: any;
    public _previousStateEncoded: string;

    private linkedFrontAndClientUids: Map<string, Set<string> >;
    private linkedFrontUids: Array<string>;
    private masterIndexToFrontUidLookup: {frontUid: string};

    public linkedFrontMasterIndexes: Array<number>;

    readonly backMasterIndex: number;

    constructor(channelId, messenger: Messenger, master: BackMasterChannel, connectionOptions?) {
        super(channelId);
        if(connectionOptions) {
            this._connectionOptions = connectionOptions;
            this.setConnectionOptions = true;
        }

        this.master = master;
        this.messenger = messenger;
        this.backMasterIndex = this.master.backMasterIndex;
        this.mainFrontUid = null;

        // frontUid defines a unique channel that lives on a frontMaster which is identified
        // by frontMasterIndex (index of the server in the cluster) but it's literally
        // just the id of the server all the channels live on.
        this.linkedFrontAndClientUids = new Map();
        this.linkedFrontUids = [];
        this.linkedFrontMasterIndexes = [];
        // keep track of all frontUids by their master's id/index.
        this.masterIndexToFrontUidLookup = {} as {frontUid: string};

        this.state = null;
        this._previousState = null;

        this._connectedFrontsData = new Map();
        this._listeningClientUids = new Set();
        this._writingClientUids = new Set();
        this._mirroredFrontUids = new Set();

        this.initializeMessageFactories();
        this.registerPreConnectedSubs();
        this.registerPreConnectedPubs();

        // register initially so if theres no hooking logic the user needs the event is still registered and fired.
        this.onAddClientWrite((...args) => {});
        this.onRemoveClientWrite((...args) => {});
    }

    set connectionOptions(options) {
        if(this.setConnectionOptions) {
            throw new Error('Can not set connection options once set.');
        }
        this.setConnectionOptions = true;
        this._connectionOptions = options;
    }

    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and frontUid
     */
    public onMessage(handler: (data: Array<any>) => void) : void {
        this.onMessageHandler = handler;
    }

    public onClientMessage(handler: ( clientUid: string, data: Array<any>) => void) : void {
        this.onClientMessageHandler = handler;
    }

    /**
     * @param handler - handler called when a client is added as a writer.
     */
    public onAddClientWrite(handler: (clientUid: string, options?: any) => void) : void {
        this.listenerCount('add_client_write') && this.removeAllListeners('add_client_write');

        this.on('add_client_write', (clientUid: string, options?: any) => {
            this._writingClientUids.add(clientUid);
            handler(clientUid, options);
        });
    }

    /**
     * @param handler - handler called when a client is added as a writer.
     */
    public onRemoveClientWrite(handler: (clientUid: string, options?: any) => void) : void {
        this.listenerCount('remove_client_write') && this.removeAllListeners('remove_client_write');

        this.on('remove_client_write', (clientUid: string, options?: any) => {
            this._writingClientUids.delete(clientUid);
            handler(clientUid, options);
        });
    }

    public onAddedClientListener(handler: (clientUid: string, options?: any) => any): void {
        this.onAddedClientListenerHandler = handler;
    }

    private onAddedClientListenerHandler(clientUid: string, options?: any) {
        return true;
    }

    /**
     * handler that is called when a client is linked to the back channel.
     * if it returns anything data it will be sent back to the front channel asynchronously
     * at index 2 with the currently encoded state at index 0 and the client uid at index 1.
     * @param handler
     */
    //TODO: onRequestAddClient - have another hook that a user can decide if there's an allowed link to the client
    public onAddClientListen(handler: (clientUid: string, options?: any) => any) : void {
        this.onAddClientListenHandler = handler;
    }

    private onAddClientListenHandler(clientUid: string, options?: any) {
        return true;
    }

    /**
     * sets the onClientListenHandler function
     * @param handler - function that gets executed when a new client is succesfully linked/listening to state updates.
     */
    public onRemoveClientListen(handler: (clientUid: string, options?: any) => void) : void {
        this.listenerCount('remove_client_listen') && this.removeAllListeners('remove_client_listen');

        this.on('remove_client_listen', (clientUid: string, options?: any) => {
            handler(clientUid, options);
        });
    }

    /**
     * called when we receive a link request from the front with no client uid. This means
     * the front is just linking for a reason that doesnt include relaying data to clients.
     * @param frontUid
     */
    private acceptLink(frontUid) {
        this.push.ACCEPT_LINK[frontUid](this._previousStateEncoded);
    };

    /**
     * sends message to specific front channel based on frontUid
     * @param message - data sent to back channel.
     * @param frontUid - uid of front channel to send message to
     */
    public send(message: any, frontUid: string) : void {
        this.push.SEND_FRONT[frontUid](message);
    }

    /**
     * sends message to the mainFrontUid front channel (see onFrontChannelConnected)
     * @param message - data sent to back channel.
     * @param frontUid - uid of front channel to send message to
     */
    public sendMainFront(message: any) : void {
        this.push.SEND_FRONT[this.mainFrontUid](message);
    }

    /**
     * sends message to supplied front channels based on frontUids or if omitted broadcasts to all front channels regardless of channel Id.
     * @param message
     * @param frontUids
     */
    public broadcast(message: any, frontUids?: Array<string>) {
        if(frontUids) {
            for(let i = 0; i < frontUids.length; i++) {
                this.send(message, frontUids[i]);
            }
        } else {
            this.pub.BROADCAST_ALL_FRONTS(message);
        }
    }

    /**
     * Sends message to all mirrored front channels that are currently linked.
     * @param message
     */
    public broadcastLinked(message: any) {
        let length = this.linkedFrontUids.length;
        while (length--) {
            this.push.BROADCAST_LINKED_FRONTS[this.linkedFrontUids[length]](message);
        }
    }

    /**
     * sets the previous encoded state in order to find the delta for next state update.
     * @param newState
     */
    public setState(newState) {
        this._previousStateEncoded = msgpack.encode(newState);
        this.state = newState;
    }

    /**
     * Function that's called from the back master when it receives queued messages
     * from a the front master server.
     * @param message
     * @param clientUid - optional parameter that would have been in n-2 position of array
     */
    public processMessageFromMaster(data, clientUid?: string) {
        this._onMessage(data, clientUid);
    }

    get connectedFrontsData() : Map<string, ConnectedFrontData> {
        return this._connectedFrontsData;
    }

    get mirroredFrontUids() : Array<string> {
        return Array.from(this._mirroredFrontUids)
    }

    get listeningClientUids() : Array<string> {
        return Array.from(this._listeningClientUids);
    }

    get writingClientUids() : Array<string> {
        return Array.from(this._writingClientUids);
    }

    //TODO: replace all instances of onMessage receiving frontUid with frontMaster and use the lookup to get the frontUid.
    private _onMessage(data: Array<any>, clientUid?: string) : void {
        if(clientUid) {
            this.onClientMessageHandler(clientUid, data);
        } else {
            this.onMessageHandler(data);
        }
    }

    private onMessageHandler(data: Array<any>) : void {
        throw new Error(`Unimplemented onMessageHandler in back channel ${this.channelId} Use backChannel.onMessage to implement.`);
    }

    private onClientMessageHandler(clientUid: string, data: Array<any>) : void {
        throw new Error(`Unimplemented onMessageHandler in back channel ${this.channelId} Use backChannel.onMessage to implement.`);
    }

    /**
     * subscriptions that we want to register before front channels start connecting.
     */
    private registerPreConnectedSubs() : void {

        // registers sub that handles requests the same regardless of the frontUid.
        this.sub.CONNECT.register(this.onFrontChannelConnected.bind(this));

        this.sub.BROADCAST_ALL_BACK.register((data: Array<any>) => {
            this._onMessage(data, data[data.length - 1]);
            //how it looks on frontChannel -> this.pub.BROADCAST_ALL_BACK([message, this.frontUid, clientUid])
        });

        this.sub.SEND_BACK.register((data: Array<any>) => {
            this._onMessage(data, data[data.length - 1]);
            //how it looks on frontChannel -> this.push.SEND_BACK[backChannelId]([message, this.frontUid, clientUid]);
        });
    }

    /**
     * publications that we want to be able to send out before channels start connecting.
     */
    private registerPreConnectedPubs() : void {
        // handler that broadcasts instance already exists on messenger before creating it if its not the first backChannel instantiated
        this.pub.BROADCAST_ALL_FRONTS.register();
    }

    /**
     * initializes channel pub and sub  handlers when we receive a connect message from front channel.
     * @param frontData - { channelId, frontUid, frontMasterIndex }
     */
    private onFrontChannelConnected(frontData: ConnectedFrontData) {
        const { channelId, frontUid, frontMasterIndex } = frontData;

        //redundant check since the frontUid already connected so all we need to do is let the front channel know its connected
        if((this._connectedFrontsData.has(frontUid)))  {
            // create push then remove since this wont be done again unless theres a disconnection.
            this.push.CONNECTION_CHANGE.register(frontUid);
            this.push.CONNECTION_CHANGE[frontUid]({ channelId: this.channelId, backMasterIndex: this.backMasterIndex, connectionStatus: CONNECTION_STATUS.CONNECTED, options: this._connectionOptions });
            this.push.CONNECTION_CHANGE.unregister();
            return;
        }

        if(channelId === this.channelId) {
            //if we havent set a main front uid yet we will upon first mirror channel connected.
            if(this.mainFrontUid === null) {
                this.mainFrontUid = frontUid;
            }
            // add to mirror set since its same channelId
            this._mirroredFrontUids.add(frontUid);

            // add the frontUid to masterIndexLookup for when processing future requests and need to know frontUid.
            this.masterIndexToFrontUidLookup[frontMasterIndex] = frontUid;

            this.push.ACCEPT_LINK.register(frontUid);
            this.push.BROADCAST_LINKED_FRONTS.register(frontUid);

            this.pull.ADD_CLIENT_WRITE.register(frontUid, (message) => {
                this.emit('add_client_write',  message[0], message[1])
            });

            this.pull.REMOVE_CLIENT_WRITE.register(frontUid, (message) => {
                const clientUid = message[0];
                const options = message[1];
                this.emit('remove_client_write', clientUid, options);
            });

            //TODO: these should be seperate actions for room link and client link..
            this.pull.LINK.register(frontUid, (message) => {
                const clientUid = message[0];
                const options = message[1];
                const linkedOptions = this.onAddClientListenHandler(clientUid, options);

                if(linkedOptions && !this._listeningClientUids.has(clientUid)) {
                    // add to set.
                    this._listeningClientUids.add(clientUid);

                    // notify master a client linked (master keeps track of how many back channels the
                    // client is connected to and also keeps a lookup to the front master index so it can
                    // send direct messages to the client by sending it to the front master.
                    this.master.addedClientLink(clientUid, frontMasterIndex);

                    const encodedState = this.state ? this._previousStateEncoded : '';

                    this.push.ACCEPT_LINK[frontUid]([encodedState, clientUid, linkedOptions]);

                    if(!(this.linkedFrontAndClientUids.has(frontUid))) {
                        this.linkedFrontAndClientUids.set(frontUid, new Set());
                        this.master.linkedChannelFrom(frontMasterIndex);
                        this.linkedFrontMasterIndexes.push(frontMasterIndex);
                        this.linkedFrontUids = Array.from(this.linkedFrontAndClientUids.keys());
                    }
                    this.linkedFrontAndClientUids.get(frontUid).add(clientUid);
                    this.onAddedClientListenerHandler(clientUid, linkedOptions);
                }
                // notify the master with the front master index of connected channel if its a new front uid
            });

            this.pull.UNLINK.register(frontUid, (message) => {
                const clientUid = message[0];
                const options = message[1];
                // makes sure linkedClientUids has the client
                //  master keeps a correct state of clients linked count.
                if(this._listeningClientUids.has(clientUid)) {
                    const clientUidSet = this.linkedFrontAndClientUids.get(frontUid);
                    this.linkedFrontAndClientUids.get(frontUid).delete(clientUid);

                    clientUidSet.delete(clientUid);

                    // no more clients exist on the frontUid or the front master that are listening, remove from lookups.
                    if(clientUidSet.size === 0) {
                        this.linkedFrontAndClientUids.delete(frontUid);
                        this.linkedFrontUids = Array.from(this.linkedFrontAndClientUids.keys());
                        this.linkedFrontMasterIndexes.splice(this.linkedFrontMasterIndexes.indexOf(frontMasterIndex), 1);
                        this.master.unlinkedChannelFrom(frontMasterIndex);
                    }

                    this.master.removedClientLink(clientUid);
                    this._listeningClientUids.delete(clientUid);

                    this.emit('remove_client_listen', clientUid, options);
                }
            });
        }

        //notify back master a new front channel connected so it can keep track of front master connections
        this.master.onChannelConnection(frontMasterIndex);

        // keep connected data stored for all fronts.
        this._connectedFrontsData.set(frontUid, frontData);

        // register send pusher for unique frontuid.
        //TODO: optimize so instead of keeping a 1:1 push for each front uid, keep a 1:1 push to frontMasterIndex of frontuid and then the correct handler will be callled
        this.push.SEND_FRONT.register(frontUid);

        // create push then remove since this wont be done again unless theres a disconnection.
        this.push.CONNECTION_CHANGE.register(frontUid);
        this.push.CONNECTION_CHANGE[frontUid]({ channelId: this.channelId, backMasterIndex: this.backMasterIndex, connectionStatus: CONNECTION_STATUS.CONNECTED, options: this._connectionOptions });
        this.push.CONNECTION_CHANGE.unregister();
    }

    /**
     * initializes needed message factories for front channels.
     */
    private initializeMessageFactories() {
        const { pub, push, sub, pull } = new BackMessages(this.messenger, this);
        this.pub = pub;
        this.push = push;
        this.sub = sub;
        this.pull = pull;
    }
}
