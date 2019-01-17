import * as fossilDelta from 'fossil-delta';
import * as msgpack from 'notepack.io';

import { Messenger } from 'centrum-messengers/dist/core/Messenger';

import { Channel } from '../../Channel/Channel';
import { BackMessages, BackPubs, BackPushes, BackSubs, BackPulls } from './BackMessages';
import { BackMasterChannel } from '../BackMaster/MasterChannel';

import {ConnectedFrontData, FrontToBackMessage, CONNECTION_STATUS } from '../../types';

class BackChannel extends Channel {
    private master: BackMasterChannel;

    private pub: BackPubs;
    private sub: BackSubs;
    private push: BackPushes;
    private pull: BackPulls;

    // lookup of frontUid to frontMasterIndex
    private _connectedFrontsData: Map<string, ConnectedFrontData>;

    private _linkedClientUids: Set<string>;

    private _mirroredFrontUids: Set<string>;

    public state: any;
    private _previousState: any;
    private _previousStateEncoded: string;

    private linkedFrontAndClientUids: Map<string, Set<string> >;
    private linkedFrontMasterIndexes: Array<number>;
    private linkedFrontUids: Array<string>;
    private masterIndexToFrontUidLookup: {frontUid: string};

    readonly backMasterIndex: number;

    constructor(channelId, messenger: Messenger, master: BackMasterChannel) {
        super(channelId, messenger);
        this.master = master;
        this.backMasterIndex = this.master.backMasterIndex;

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
        this._linkedClientUids = new Set();
        this._mirroredFrontUids = new Set();

        this.initializeMessageFactories();
        this.registerPreConnectedSubs();
        this.registerPreConnectedPubs();

        // register initially so if theres no hooking logic the user needs the event is still registered and fired.
        this.onAddClient((...args) => {});
    }

    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and frontUid
     */
    public onMessage(handler: (message: any, frontUid: string) => void) : void {
        this.onMessageHandler = handler;
    }

    /**
     * sets the onClientListenHandler function
     * @param handler - function that gets executed when a new client is succesfully linked/listening to state updates.
     */
    public onRemoveClient(handler: (clientUid: string, options?: any) => any) : void {
        this.listenerCount('remove_client') && this.removeAllListeners('remove_client');

        this.on('remove_client', (clientUid: string, options?: any) => {
            handler(clientUid, options);
        });
    }

    /**
     * handler that is called when a client is linked to the back channel.
     * if it returns anything data it will be sent back to the front channel asynchronously
     * at index 2 with the currently encoded state at index 0 and the client uid at index 1.
     * @param handler
     */
    //TODO: onRequestAddClient - have another hook that a user can decide if there's an allowed link to the client
    public onAddClient(handler: (clientUid: string, options?: any) => any) : void {
        this.listenerCount('add_client') && this.removeAllListeners('add_client');

        this.on('add_client', (frontUid: string, clientUid: string, encodedState: string, options?: any) => {
            // if handler returns data we want to send it back as options to front channel.
            const responseOptions = handler(clientUid, options);
            responseOptions ?
                this.push.ACCEPT_LINK[frontUid]([encodedState, clientUid, responseOptions]) :
                this.push.ACCEPT_LINK[frontUid]([encodedState, clientUid]);
        });
    }
    /**
     * finds the delta of the new and last state then adds the patch update
     * to the master for it to be queued and then sent out to the needed
     * front Masters for it to be relayed to the front children who need it.
     * @returns {boolean}
     */
    public patchState() : boolean {
        if(!(this.state)) { throw new Error ('null state')}

        if(this.linkedFrontAndClientUids.size > 0) {
            const currentState = this.state;
            const currentStateEncoded = msgpack.encode(currentState);

            if(currentStateEncoded.equals(this._previousStateEncoded)) {
                return false;
            }
            const patches = fossilDelta.create(this._previousStateEncoded, currentStateEncoded);

            this._previousStateEncoded = currentStateEncoded;

            // supply master server with patches and the array of linked master indexes that need the patches.
            this.master.addStatePatch(this.linkedFrontMasterIndexes, [this.channelId, patches]);

            return true;
        }
        return false;
    };

    /**
     * called when we receive a link request from the front with no client uid. This means
     * the front is just linking for a reason that doesnt include relaying data to clients.
     * @param frontUid
     */
    private acceptLink(frontUid) {
        this.push.ACCEPT_LINK[frontUid](this._previousStateEncoded);
    };

    /**
     * gets called when a link publish message is received and a new unique client
     * has been linked to given channel.
     * @param frontUid - unique front channel sending link request.
     * @param frontMasterIndex - front master index the client is connected to.
     * @param clientUid - uid of client.
     * @param options - additional options client passed upon link request
     */
    private acceptClientLink(frontUid, frontMasterIndex, clientUid, options?) {

        // add to set.
        this._linkedClientUids.add(clientUid);

        // notify master a client linked (master keeps track of how many back channels the
        // client is connected to and also keeps a lookup to the front master index so it can
        // send direct messages to the client by sending it to the front master.
        this.master.addedClientLink(clientUid, frontMasterIndex);

        const encodedState = this.state ? this._previousStateEncoded : '';

        this.emit('add_client', frontUid, clientUid, encodedState, options);
    }

    /**
     * sends message to specific front channel based on frontUid
     * @param message - data sent to back channel.
     * @param frontUid - uid of front channel to send message to
     */
    public send(message: any, frontUid: string) : void {
        this.push.SEND_FRONT[frontUid]({ message, channelId: this.channelId});
    }

    /**
     * sends message to supplied front channels based on frontUids or if omitted broadcasts to all front channels regardless of channel Id.
     * @param message
     * @param frontUids
     */
    public broadcast(message: any, frontUids?: Array<string>) {
        if(frontUids) {
            frontUids.forEach(frontUid => {
                this.send(message, frontUid);
            });
        } else {
            this.pub.BROADCAST_ALL_FRONTS({
                message,
                channelId: this.channelId,
            });
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
     * @param frontMasterIndex
     */
    public processMessageFromMaster(message, frontMasterIndex: number) {
        const frontUid = this.masterIndexToFrontUidLookup[frontMasterIndex];
        this._onMessage(message, frontUid);
    }

    get connectedFrontsData() : Map<string, ConnectedFrontData> {
        return this._connectedFrontsData;
    }

    get mirroredFrontUids() : Array<string> {
        return Array.from(this._mirroredFrontUids)
    }

    get linkedClientUids() : Array<string> {
        return Array.from(this._linkedClientUids);
    }

    private _onMessage(message: any, frontUid: string) : void {
        this.onMessageHandler(message, frontUid);
    }

    private onMessageHandler(message: any, frontUid: string) : void {
        throw new Error(`Unimplemented onMessageHandler in back channel ${this.channelId} Use backChannel.onMessage to implement.`);
    }

    /**
     * subscriptions that we want to register before front channels start connecting.
     */
    private registerPreConnectedSubs() : void {

        // registers sub that handles requests the same regardless of the frontUid.
        this.sub.CONNECT.register(this.onMirrorConnected.bind(this));

        this.sub.BROADCAST_ALL_BACK.register((data: FrontToBackMessage) => {
            const { message, frontUid } = data;
            this._onMessage(message, frontUid);
        });

        this.sub.SEND_BACK.register((data: FrontToBackMessage) => {
            const { message, frontUid } = data;
            this._onMessage(message, frontUid);
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
    private onMirrorConnected(frontData: ConnectedFrontData) {
        const { channelId, frontUid, frontMasterIndex } = frontData;

        //notify back master a new front channel connected so it can keep track of front master connections
        this.master.onChannelConnection(frontMasterIndex);

        if(channelId === this.channelId) {
            // add to mirror set since its same channelId
            this._mirroredFrontUids.add(frontUid);

            // add the frontUid to masterIndexLookup for when processing future requests and need to know frontUid.
            this.masterIndexToFrontUidLookup[frontMasterIndex] = frontUid;

            this.push.ACCEPT_LINK.register(frontUid);
            this.push.BROADCAST_LINKED_FRONTS.register(frontUid);

            //TODO: these should be seperate actions for room link and client link..
            this.pull.LINK.register(frontUid, (message) => {
                const clientUid = message[0];
                const options = message[1];
                if(!(this.linkedFrontAndClientUids.has(frontUid))) {
                    this.linkedFrontAndClientUids.set(frontUid, new Set());
                    this.master.linkedChannelFrom(frontMasterIndex);
                    this.linkedFrontMasterIndexes.push(frontMasterIndex);
                    this.linkedFrontUids = Array.from(this.linkedFrontAndClientUids.keys());
                }
                this.linkedFrontAndClientUids.get(frontUid).add(clientUid);

                this.acceptClientLink(frontUid, frontMasterIndex, clientUid, options);
                // notify the master with the front master index of connected channel if its a new front uid

            });

            this.pull.UNLINK.register(frontUid, (message) => {
                const clientUid = message[0];
                const options = message[1];
                // makes sure linkedClientUids has the client
                //  master keeps a correct state of clients linked count.
                if(this._linkedClientUids.has(clientUid)) {
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
                    this._linkedClientUids.delete(clientUid);

                    this.emit('remove_client', clientUid, options);
                }
            });
        }

        // keep connected data stored for all fronts.
        this._connectedFrontsData.set(frontUid, frontData);

        // register send pusher for unique frontuid.
        //TODO: optimize so instead of keeping a 1:1 push for each front uid, keep a 1:1 push to frontMasterIndex of frontuid and then the correct handler will be callled
        this.push.SEND_FRONT.register(frontUid);

        // create push then remove since this wont be done again unless theres a disconnection.
        this.push.CONNECTION_CHANGE.register(frontUid);
        this.push.CONNECTION_CHANGE[frontUid]({ channelId: this.channelId, backMasterIndex: this.backMasterIndex, connectionStatus: CONNECTION_STATUS.CONNECTED });
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

export default BackChannel;