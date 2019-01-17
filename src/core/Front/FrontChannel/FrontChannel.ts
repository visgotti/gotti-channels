import { Channel } from '../../Channel/Channel';
import { FrontMasterChannel } from '../FrontMaster/MasterChannel';
import Client from '../../Client';
import { Messenger } from 'centrum-messengers/dist/core/Messenger';
import { FrontMessages, FrontPubs, FrontSubs, FrontPushes } from './FrontMessages';

import { CONNECTION_STATUS, CONNECTION_CHANGE, STATE_UPDATE_TYPES } from '../../types';

import {clearTimeout} from "timers";
import Timeout = NodeJS.Timeout;

class FrontChannel extends Channel {
    private master: FrontMasterChannel;

    private connectedChannelIds: Set<string>;
    private _connectionInfo: any;

    private pub: FrontPubs;
    private sub: FrontSubs;
    private push: FrontPushes;

    private CONNECTION_STATUS: CONNECTION_STATUS;

    private linked: boolean;
    private linkedClients: Map<string, Client>;
    public linkedClientUids: Array<string>;

    private clientLinkTimeouts: Map<string, Timeout>;

    // index of back master that the mirrored channel lives on.
    private backMasterIndex: number;

    // unique id to identify front channel based on channelId and frontMasterIndex
    readonly frontUid : string;
    // index of server in cluster front channel lives on
    readonly frontMasterIndex: number;
    // count of total the front channel can be communicating with
    readonly totalChannels: number;
    // timeout length for waiting client connections
    readonly clientTimeout: number;

    constructor(channelId, totalChannels, messenger: Messenger,  master: FrontMasterChannel) {
        super(channelId, messenger);
        this.master = master;

        this.CONNECTION_STATUS = CONNECTION_STATUS.DISCONNECTED;

        this.connectedChannelIds = new Set();

        this.clientLinkTimeouts = new Map();

        this.linkedClients = new Map();
        this.linkedClientUids = [];

        this.linked = false;

        // front id is used for 1:1 back to front communication.
        this.frontUid = `${channelId}-${this.master.frontMasterIndex.toString()}`;
        this.frontMasterIndex = master.frontMasterIndex;
        this.totalChannels = totalChannels;
        //TODO: do a retry system if client still needs connection.
        this.clientTimeout = 5000;

        this.initializeMessageFactories();
        this.registerPreConnectedSubs();
        this.registerPreConnectedPubs();
    };

    /**
     * sets the onConnectedHandler function
     * @param handler - function that gets executed when a channel succesfully connects to a backChannel.
     */
    public onConnected(handler: (backChannelId, backMasterIndex) => void) : void {
        this.onConnectedHandler = handler;
    };

    /**
     * sets the onPatchStateHHandler, the patch is not decoded or applied and its left for you to do that..
     * the reason for this is if you may not want to use cpu applying the patch and just want to forward it.
     * @param handler - function that gets executed after channel receives and applies patched state from .
     */
    public onPatchState(handler: (patch) => void) : void {
        this.onPatchStateHandler = handler
    };

    public patchState(patch) {
        this._onPatchState(patch);
    }

    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and channelId
     */
    public onMessage(handler: (message: any, channelId: string) => void) : void {
        this.onMessageHandler = handler
    };


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
    public async linkClient(client: Client, options?: any) : Promise<any> {

        const clientUid = client.uid;
        if(!(this.linked)) this.linked = true;

        if(!(this.clientCanLink(clientUid))) throw new Error ('Client is already in connection state.');

        // set timeout for client linking
        this.clientLinkTimeouts.set(clientUid, setTimeout(() => {
            this.clientLinkTimeouts.delete(clientUid);
            this.emitClientLinked(clientUid, null, { error: `Client ${clientUid} connection request to ${this.channelId} timed out`});
        }, this.clientTimeout));

        options ? this.pub.LINK([clientUid, options]) : this.pub.LINK([clientUid]);

        return new Promise((resolve, reject) => {
            // if the link is for a uid it registers the event with the uid in it.
            const linkedEventId =  `linked_${clientUid}`;
            this.once(linkedEventId, (encodedState: string, responseOptions?: any) => {

                clearTimeout(this.clientLinkTimeouts.get(clientUid));
                this.clientLinkTimeouts.delete(clientUid);


                if(responseOptions && responseOptions.error) {
                    return reject(responseOptions.error);
                }

                this.linkedClients.set(clientUid, client);
                this.linkedClientUids.push(clientUid);
                this.master.linkChannel(this.backMasterIndex);

                return resolve({ encodedState, responseOptions });
            });
        });
    }

    /**
     * sends unlink message, it will decrement or remove the client lookup data on the back,
     * the back channel checks if there are any clients left with a link to the front master
     * and if not it will stop keeping track of it until it receives another link.
     * @param clientUid
     */
    public unlinkClient(clientUid: string, options?: any) {
        if(this.linkedClients.has(clientUid)) {
            const index = this.linkedClientUids.indexOf(clientUid);
            if(index > -1) {
                this.linkedClientUids.splice(index, 1);
            }
            this.linkedClients.get(clientUid).onChannelDisconnect(this.channelId);
            this.linkedClients.delete(clientUid);
        } else if (this.clientLinkTimeouts.has(clientUid)) {
            clearTimeout(this.clientLinkTimeouts.get(clientUid));
            this.clientLinkTimeouts.delete(clientUid);
        }
        options ? this.pub.UNLINK([clientUid, options]) : this.pub.UNLINK([clientUid]);

        if(this.linkedClients.size === 0 && this.clientLinkTimeouts.size === 0) {
            this.linked = false;
            this.master.unlinkChannel(this.backMasterIndex);
        }

    }

    /**
     * adds message to the front master's message queue. These queue up and will then send
     * to the appropriate back master at a set interval, where upon reaching the back master,
     * the back master will iterate through the messages received and dispatch them to the child
     * back channels to process.
     * @param message
     */
    public addMessage(message: any) {
        if(!(this.linked)) {
            throw new Error('Front Channel is not linked, can not add messages to master queue.');
        }
        this.master.addQueuedMessage(message, this.backMasterIndex, this.channelId);
    };

    /**
     * sends message to mirror back channel by default if backChannelId is omitted or sends to remote back channel with specified id.
     * @param message - data sent to back channel.
     * @param backChannelId - id of back channel to send message to
     */
    public send(message: any, backChannelId=this.channelId) : void {
        let data = { message,  frontUid: this.frontUid };
        this.push.SEND_BACK[backChannelId](data);
    }

    /**
     * sends message to all specified backChannelIds, if omitted it will send broadcast to all connected remote and mirror back channels.
     * @param message
     * @param backChannelIds
     */
    public broadcast(message: any, backChannelIds?: Array<string>) : void {
        if(backChannelIds) {
            backChannelIds.forEach(channelId => {
               this.send(message, channelId);
            });
        } else {
            this.pub.BROADCAST_ALL_BACK({ frontUid: this.frontUid, message  })
        }
    }

    /**
     * sends out a connection publication then as back channels reply with a connect success publication keeps track and
     * when all replied the promise gets resolved and the connection timeout gets cleared.
     * @param timeout - time in milliseconds to wait for all back channels to reply before throwing an error.
     */
    public async connect(timeout=15000) {
        return new Promise((resolve, reject) => {

            const validated = this.validateConnectAction(CONNECTION_STATUS.CONNECTING);
            if(validated.error) {
                return reject(validated.error);
            }

            this.pub.CONNECT({
                frontUid: this.frontUid,
                frontMasterIndex: this.frontMasterIndex,
                channelId: this.channelId
            });

            let connectionTimeout = setTimeout(() => {
                return reject(`Timed out waiting for ${(this.connectedChannelIds.size - this.totalChannels)} connections`);
            }, timeout);

            let connectedChannelIds = new Set();
            let connectedBackMasterIndexes = new Set();

            this.on('connected', (channelId, backMasterIndex) => {

                connectedChannelIds.add(channelId);
                connectedBackMasterIndexes.add(backMasterIndex);

                // run user defined handler. (set with onConnectedHandler())
                this.onConnectedHandler(channelId, backMasterIndex);

                this.connectedChannelIds.add(channelId);
                if (this.connectedChannelIds.size === this.totalChannels) {

                    // dont need to listen for connected emition
                    // or wait for a timeout anymore
                    clearTimeout(connectionTimeout);

                    this.removeAllListeners('connected');

                    this.CONNECTION_STATUS = CONNECTION_STATUS.CONNECTED;

                    return resolve({
                        channelIds: Array.from(connectedChannelIds.values()),
                        backMasterIndexes: Array.from(connectedBackMasterIndexes.values())
                    });
                }
            });
        })
    }

    get connectionInfo(): any {
        return {
            connectedChannelIds: Array.from(this.connectedChannelIds),
            connectionStatus: this.CONNECTION_STATUS,
            isLinked: this.linked,
        }
    }

    private emitClientLinked( clientUid: string, encodedState?: string, responseOptions?: any) {
        this.emit(`linked_${clientUid}`, encodedState, responseOptions);
    }

    private _onPatchState(patch: any) : void {
        if(!this.linked) return;

        for(let client of this.linkedClients.values()) {
            client.addStateUpdate(this.channelId, patch, STATE_UPDATE_TYPES.PATCH);
        }
        this.onPatchStateHandler(patch);
    }

    private onPatchStateHandler(patch: any) : void {}

    private _onMessage(message: any, channelId: string) : void {
        this.onMessageHandler(message, channelId);
    }
    private onMessageHandler(message: any, channelId: string) : void {
        throw new Error(`Unimplemented onMessageHandler in front channel ${this.channelId} Use frontChannel.onMessage to implement.`);
    }

    private _onConnectionChange(backChannelId, backMasterIndex, change: CONNECTION_CHANGE) {
        if(change === CONNECTION_CHANGE.CONNECTED) {
            this._onConnected(backChannelId, backMasterIndex);
        } else if(change === CONNECTION_CHANGE.DISCONNECTED) {
            this._onDisconnect(backChannelId, backMasterIndex);
        } else {
            throw new Error(`Unrecognized connection change value: ${change} from backChannel: ${backChannelId}`)
        }
    }

    /**
     * registers needed pub and subs when connected and runs handler passed into onConnected(optional)
     * if its the same channelId
     * @param backChannelId
     * @param backMasterIndex - index of the Back Channel's master.
     */
    private _onConnected(backChannelId, backMasterIndex) {
        // channelId of connected backChannel was the same so register pub/subs meant for mirrored channels.
        if(backChannelId === this.channelId) {
            this.backMasterIndex = backMasterIndex;

            this.sub.BROADCAST_LINKED_FRONTS.register(message => {
                //TODO: maybe this should be handled in a seperate onMirroredMessage or something similar.. will do if it seems needed.
                this._onMessage(message, this.channelId);
            });

            this.sub.ACCEPT_LINK.register((data)  => {
                // data[0] - encodedState
                // data[1] - clientUid
                // data[2] - responseOptions
                this.emitClientLinked(data[1], data[0], data[2]);
            });

            this.pub.LINK.register();
            this.pub.UNLINK.register();
        }

        this.push.SEND_BACK.register(backChannelId);

        this.emit('connected', backChannelId, backMasterIndex);
    }

    private onConnectedHandler(backChannelId, backMasterIndex) : void {};

    private validateConnectAction(REQUEST_STATUS: CONNECTION_STATUS) : { success: boolean, error?: string } {
        let validated = { success: true, error: null };
        if(REQUEST_STATUS === CONNECTION_STATUS.CONNECTING) {
            if(this.CONNECTION_STATUS === CONNECTION_STATUS.CONNECTING || this.CONNECTION_STATUS === CONNECTION_STATUS.CONNECTED) {
                validated.success = false;
                validated.error = 'Channel is connected or in the process of connecting.';
            }
        }

        /*
        if(this.CONNECTION_STATUS === CONNECTION_STATUS.DISCONNECTING) {
            validated.success = false;
            validated.error = 'Channel is in the process of disconnecting.';
        }
        */

        this.CONNECTION_STATUS = REQUEST_STATUS;

        return validated;
    }

    /**
     * subscriptions that we want to register pre connection.
     */
    private registerPreConnectedSubs() : void {
        //todo: create some sort of front SERVER class wrapper so we can optimaly handle backChannel -> front SERVER messages (things that not every channel need to handle)
        this.sub.SEND_FRONT.register(data => {
            this._onMessage(data.message, data.channelId);
        });

        this.sub.CONNECTION_CHANGE.register(data => {
            //todo: refactor to look cleaner for when I eventually pass in state.
            this._onConnectionChange(data.channelId, data.backMasterIndex, data.connectionStatus);
        });

        this.sub.BROADCAST_ALL_FRONTS.register(data => {
            this._onMessage(data.message, data.channelId)
        })
    }

    /**
     * Publications we initialize before connections are made.
     */
    private registerPreConnectedPubs() : void {
        this.pub.CONNECT.register();
        this.pub.BROADCAST_ALL_BACK.register();
    }

    /**
     * initializes needed message factories for front channels.
     */
    private initializeMessageFactories() {
        const { pub, push, sub } = new FrontMessages(this.messenger, this);
        this.pub = pub;
        this.push = push;
        this.sub = sub;
    }

    private clientCanLink(clientUid) : boolean {
        return (!(this.clientLinkTimeouts.has(clientUid)) && !(this.linkedClients.has(clientUid)));
    }
}

export default FrontChannel;