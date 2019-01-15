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

    private _mirroredFrontUids: Set<string>;

    public state: any;
    private _previousState: any;
    private _previousStateEncoded: string;

    private linkedFrontUids: Set<string>;
    private linkedFrontMasterIndexes: Array<number>;
    private masterIndexToFrontUidLookup: {frontUid: string};

    readonly backMasterIndex: number;

    constructor(channelId, messenger: Messenger, master: BackMasterChannel) {
        super(channelId, messenger);
        this.master = master;
        this.backMasterIndex = this.master.backMasterIndex;

        // frontUid defines a unique channel that lives on a frontMaster which is identified
        // by frontMasterIndex (index of the server in the cluster) but it's literally
        // just the id of the server all the channels live on.
        this.linkedFrontUids = new Set();
        this.linkedFrontMasterIndexes = [];
        // keep track of all frontUids by their master's id/index.
        this.masterIndexToFrontUidLookup = {} as {frontUid: string};

        this.state = null;
        this._previousState = null;

        this._connectedFrontsData = new Map();
        this._mirroredFrontUids = new Set();

        this.initializeMessageFactories();
        this.registerPreConnectedSubs();
        this.registerPreConnectedPubs();
    }

    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and frontUid
     */
    public onMessage(handler: (message: any, frontUid: string) => void) : void {
        this.onMessageHandler = handler;
    }

    /**
     * finds the delta of the new and last state then adds the patch update
     * to the master for it to be queued and then sent out to the needed
     * front Masters for it to be relayed to the front children who need it.
     * @returns {boolean}
     */
    public patchState() : boolean {
        if(!(this.state)) { throw new Error ('null state')}

        if(this.linkedFrontUids.size > 0) {
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
     * gets called when there is a link request from a front channel and it gets approved
     * if the client Uid is present that means we must notify the master that there is
     * a new linked client listening for updates and will allow the master to do a lookup
     * of the client's frontMasterIndex for when trying to send direct messages to that client.
     * @param frontUid
     * @param frontMasterIndex
     * @param clientUid (optional)
     */
    private acceptLink(frontUid, frontMasterIndex, clientUid?) {
        const sendData: any = {};
        if(clientUid) {
            sendData.clientUid = clientUid;
            this.master.addedClientLink(clientUid, frontMasterIndex);
        }

        if(!(this.state)) {
            sendData.error = 'null state on back channel, failed to link.';
        } else {
            sendData.encodedState = this._previousStateEncoded
        }
        this.push.ACCEPT_LINK[frontUid](sendData);
    };

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
        this.linkedFrontUids.forEach(frontUid => {
            this.push.BROADCAST_LINKED_FRONTS[frontUid](message);
        });
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

            this.pull.LINK.register(frontUid, (clientUid?) => {
                this.linkedFrontMasterIndexes.push(frontMasterIndex);
                this.linkedFrontUids.add(frontUid);

                //TODO: maybe have a set of clientuids to prevent duplicates?
                this.acceptLink(frontUid, frontMasterIndex, clientUid);
                // notify the master with the front master index of connected channel.
                this.master.linkedChannelFrom(frontMasterIndex);
            });

            this.pull.UNLINK.register(frontUid, (clientUid?) => {
                // if there is no client uid supplied that means that all the channels from front channel unlinked.
                if(clientUid === false) {
                    this.linkedFrontMasterIndexes.splice(this.linkedFrontMasterIndexes.indexOf(frontMasterIndex), 1);
                    this.linkedFrontUids.delete(frontUid);
                    this.master.unlinkedChannelFrom(frontMasterIndex);
                } else {
                    this.master.removedClientLink(clientUid);
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