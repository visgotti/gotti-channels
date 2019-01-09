import { Channel } from '../Channel/Channel';
import { Client } from '../Client';
import { Messenger } from 'centrum-messengers/dist/core/Messenger';
import { FrontMessages, FrontPubs, FrontSubs, FrontPushes } from './FrontMessages';

import { CONNECTION_STATUS, CONNECTION_CHANGE } from '../types';

import {clearTimeout} from "timers";
import Timeout = NodeJS.Timeout;

class FrontChannel extends Channel {
    private connectedChannelIds: Set<string>;
    private _connectionInfo: any;

    private queuedMessages: Array<any>;

    private pub: FrontPubs;
    private sub: FrontSubs;
    private push: FrontPushes;

    private _state: any;

    private CONNECTION_STATUS: CONNECTION_STATUS;

    private linked: boolean;
    private connectedClients: Map<string, Client>;

    private clientConnectedCallbacks: Map<string, Function>;
    private clientConnectedTimeouts: Map<string, Timeout>;

    // unique id to identify front channel based on channelId and serverIndex
    readonly frontUid : string;
    // index of server in cluster front channel lives on
    readonly serverIndex: number;
    // count of total the front channel can be communicating with
    readonly totalChannels: number;
    // timeout length for waiting client connections
    readonly clientTimeout: number;

    constructor(channelId, serverIndex, totalChannels, messenger: Messenger) {
        super(channelId, messenger);

        this.CONNECTION_STATUS = CONNECTION_STATUS.DISCONNECTED;

        this.connectedChannelIds = new Set();

        this.clientConnectedCallbacks = new Map();
        this.clientConnectedTimeouts = new Map();
        this.connectedClients = new Map();

        this.queuedMessages = [];

        this.linked = false;

        // front id is used for 1:1 back to front communication.
        this.frontUid = `${channelId}-${serverIndex.toString()}`;
        this.serverIndex = serverIndex;
        this.totalChannels = totalChannels;
        //TODO: do a retry system if client still needs connection.
        this.clientTimeout = 5000;

        this.initializeMessageFactories();
        this.registerPreConnectedSubs();
        this.registerPreConnectedPubs();
    };

    /**
     *
     * @param client
     * @param timeout
     */
    public async connectClient(client: Client, timeout?) {
        try {
            if(!(this.clientCanConnect(client.uid))) throw new Error ('Client is already in connection state.');

            const state = await this._connectClient(client.uid);

            this.connectedClients.set(client.uid, client);

            console.log('if this wasnt first', state);
            return state;

        } catch (err) {
            throw err;
        }
        console.log('not returning async')
        // add client to awaiting connections with a callback to initialize the client with the state

    }

    /**
     * sets the onConnectedHandler function
     * @param handler - function that gets executed when a channel succesfully connects to a backChannel.
     */
    public onConnected(handler: (backChannelId, state?: any) => void) : void {
        this.onConnectedHandler = handler;
    };

    /**
     * sets the setStateHandler function, the state is not decoded for same reason as the patches
     * are not. you may want to just blindly pass it along and not waste cpu decoding it.
     * @param handler - function that gets executed when mirror back channel sends whole state
     */
    public onSetState(handler: (encodedState: any, clientUid?) => void) : void {
        this.onSetStateHandler = handler;
    };

    /**
     * sets the onPatchStateHHandler, the patch is not decoded or applied and its left for you to do that..
     * the reason for this is if you may not want to use cpu applying the patch and just want to forward it.
     * @param handler - function that gets executed after channel receives and applies patched state from .
     */
    public onPatchState(handler: (patches) => void) : void {
        this.onPatchStateHandler = handler
    };

    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and channelId
     */
    public onMessage(handler: (message: any, channelId: string) => void) : void {
        this.onMessageHandler = handler
    };


    /**
     * sends a link message to mirror back channel to notify it that it needs to receive current state and then
     * receive patches and messages. if theres a client uid to initiate the link, the back server will respond with
     * the clientUid when it replies with state which gets used to call the callback in clientConnectedCallbacks map
     */
    public link(clientUid=false) {
        this.linked = true;
        this.pub.LINK(clientUid);
    }

    /**
     * sends an unlink message to back channel so it stops receiving patch updates
     */
    public unlink() {
        this.linked = false;
        this.pub.UNLINK(0);

        // make sure all clients become unlinked with it.
        if(this.clientConnectedCallbacks.size > 0 || this.connectedClients.size > 0) {
            this.disconnectAllClients();
        }
    }

    /**
     * adds message to queue to be sent to mirror back channel when broadcastQueued() is called.
     * @param message
     * @returns number - length of queued messages
     */
    public addMessage(message: any) : number {
        this.queuedMessages.push(message);
        return this.queuedMessages.length;
    };

    /**
     * used to publish all queued messages to mirror back channel queuedMessages is emptied when called.
     */
    public sendQueued() : void {
        this.pub.SEND_QUEUED(this.queuedMessages);
        this.clearQueued();
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
                reject(validated.error);
            }

            this.pub.CONNECT({
                frontUid: this.frontUid,
                serverIndex: this.serverIndex,
                channelId: this.channelId
            });

            let connectionTimeout = setTimeout(() => {
                reject(`Timed out waiting for ${(this.connectedChannelIds.size - this.totalChannels)} connections`);
            }, timeout);

            this.on('connected', (channelId) => {
                this.connectedChannelIds.add(channelId);
                if (this.connectedChannelIds.size === this.totalChannels) {
                    clearTimeout(connectionTimeout);
                    this.removeAllListeners('connected');
                    this.CONNECTION_STATUS = CONNECTION_STATUS.CONNECTED;
                    resolve(this.connectedChannelIds);
                }
            });
        })
    }

    /**
     * Either disconnects from given channel ids or by default disconnects from all.
     * @param channelIds - Channel Ids to disconnect from.
     * @param timeout - wait time to finish all disconnections before throwing error.
     * @returns {Promise<T>}
     */
    public async disconnect(channelIds?: Array<string>, timeout=15000) {
        const awaitingChannelIds = new Set(channelIds) || this.connectedChannelIds;
        return new Promise((resolve, reject) => {

            const validated = this.validateConnectAction(CONNECTION_STATUS.DISCONNECTING);
            if(validated.error) {
                reject(validated.error);
            }

            this.on('disconnected', (channelId) => {
                let disconnectionTimeout = setTimeout(() => {
                    reject(`Timed out waiting for ${(awaitingChannelIds.size)} disconnections`);
                }, timeout);

                awaitingChannelIds.delete(channelId);
                if (awaitingChannelIds.size === 0) {
                    clearTimeout(disconnectionTimeout);
                    this.removeAllListeners('disconnected');
                    // if we still have some connections open keep status as connected otherwise its disconnected.
                    this.CONNECTION_STATUS = (this.connectedChannelIds.size > 0) ? CONNECTION_STATUS.CONNECTED : CONNECTION_STATUS.DISCONNECTED;
                    resolve(this.connectedChannelIds.size);
                }
            });
        })
    }

    public clearQueued() {
        this.queuedMessages.length = 0;
    }

    get state(): any {
        return this._state;
    }

    get connectionInfo(): any {
        return {
            connectedChannelIds: Array.from(this.connectedChannelIds),
            connectionStatus: this.CONNECTION_STATUS,
        }
    }

    // business logic for connecting client
    private async _connectClient(uid) {
        this.link(uid);

        return new Promise((resolve, reject) => {
            this.clientConnectedCallbacks.set(uid, (state) => {
                this.clientConnectedCallbacks.delete(uid);
                clearTimeout(this.clientConnectedTimeouts.get(uid));
                this.clientConnectedTimeouts.delete(uid);

                if(state === false) {
                    reject(new Error('Client disconnected during connection'));
                }
                resolve(state);
            });

            this.clientConnectedTimeouts.set(uid, setTimeout(() => {
                this.clientConnectedCallbacks.delete(uid);
                this.clientConnectedTimeouts.delete(uid);
                reject(new Error(`Client ${uid} connection request to ${this.channelId} timed out`));
            }, this.clientTimeout));
        })
    }

    public disconnectClient(clientUid) {
        if(this.clientConnectedCallbacks.has(clientUid)) {
            // if the client was still waiting for callback to be called, call it with false state so the promise gets rejected.
            this.clientConnectedCallbacks.get(clientUid)(false);
        }
        if(this.connectedClients.has(clientUid)) {
            this.connectedClients[clientUid].onChannelDisconnect(this.channelId);
            this.connectedClients.delete(clientUid);
        }
        // after client finishes disconnecting check if we still have any clients, if not then unlink from back channel.
        if(this.clientConnectedCallbacks.size === 0 && this.connectedClients.size === 0) {
            this.unlink();
        }
    }

    private disconnectAllClients() {
        Object.keys(this.clientConnectedCallbacks).forEach(clientUid => {
           this.disconnectClient(clientUid);
        });

        Object.keys(this.connectedClients).forEach(clientUid => {
           this.disconnectClient(clientUid)
        });
    }

    private _onSetState(encodedState: any, clientUid?) : void  {
        if(!this.linked) return;

        if(clientUid) {
            this.handleSetStateForClient(encodedState, clientUid);
        }

        this.onSetStateHandler(encodedState, clientUid);
    }

    /**
     * received full state from back channel, check if its for
     * a client awaiting for its connected callback and then
     * check if the client is in the connected map
     * @param clientUid
     * @param state
     */
    private handleSetStateForClient(state, clientUid) : boolean {
        console.log('client uid was', clientUid);
        if(this.clientConnectedCallbacks.has(clientUid)) {
            this.clientConnectedCallbacks.get(clientUid)(state);
            return true;
        } else if(this.connectedClients.has(clientUid)) {
            const client = this.connectedClients.get(clientUid);
            client.addEncodedStateSet(this.channelId, state);
            return true;
        } else {
            console.warn('tried handling state for a client not in channel.')
        }
    }

    private onSetStateHandler(newState: any, clientUid?) : void {}

    private _onPatchState(patches: any) : void {
        if(!this.linked) return;

        for(let client of this.connectedClients.values()) {
            client.addEncodedStatePatch(this.channelId, patches);
        }
        this.onPatchStateHandler(patches);
    }

    private onPatchStateHandler(patches: any) : void {}

    private _onMessage(message: any, channelId: string) : void {
        this.onMessageHandler(message, channelId);
    }
    private onMessageHandler(message: any, channelId: string) : void {
        throw new Error(`Unimplemented onMessageHandler in front channel ${this.channelId} Use frontChannel.onMessage to implement.`);
    }

    private _onConnectionChange(backChannelId, change: CONNECTION_CHANGE, data?) {
        if(change === CONNECTION_CHANGE.CONNECTED) {
            this._onConnected(backChannelId, data);
        } else if(change === CONNECTION_CHANGE.DISCONNECTED) {
            this._onDisconnect(backChannelId, data);
        } else {
            throw new Error(`Unrecognized connection change value: ${change} from backChannel: ${backChannelId}`)
        }
    }

    /**
     * registers needed pub and subs when connected and runs handler passed into onConnected(optional)
     * if its the same channelId
     * @param backChannelId
     * @param state - if its the mirrored channelId, it will have the current state as well.
     */
    private _onConnected(backChannelId, state?: any) {
        // channelId of connected backChannel was the same so register pub/subs meant for mirrored channels.
        if(backChannelId === this.channelId) {
            this.sub.BROADCAST_LINKED_FRONTS.register(message => {
                //TODO: maybe this should be handled in a seperate onMirroredMessage or something similar.. will do if it seems needed.
                this._onMessage(message, this.channelId);
            });

            this.sub.PATCH_STATE.register(this._onPatchState.bind(this));
            this.sub.SET_STATE.register((received) => {
                this._onSetState(Buffer.from(received.encodedState.data), received.clientUid);
            });
            this.pub.SEND_QUEUED.register();
            this.pub.LINK.register();
            this.pub.UNLINK.register();
        }

        this.push.SEND_BACK.register(backChannelId);
        this.pub.DISCONNECT.register(backChannelId);

        this.onConnectedHandler(backChannelId, state);

        this.emit('connected', backChannelId);
    }

    private onConnectedHandler(backChannelId, state?: any) : void {};

    private onDisconnected(backChannelId) {
        // channelId of connected backChannel was the same so register pub/subs meant for mirrored channels.
        if(backChannelId === this.channelId) {
            this.pub.SEND_QUEUED.unregister();
        }

        this.pub.DISCONNECT.unregister();
        this.push.SEND_BACK.unregister();
    }

    private validateConnectAction(REQUEST_STATUS: CONNECTION_STATUS) : { success: boolean, error?: string } {
        let validated = { success: true, error: null };
        if(this.CONNECTION_STATUS === CONNECTION_STATUS.CONNECTING) {
            validated.success = false;
            validated.error = 'Channel is in the process of connecting.';
        }

        if(this.CONNECTION_STATUS === CONNECTION_STATUS.DISCONNECTING) {
            validated.success = false;
            validated.error = 'Channel is in the process of disconnecting.';
        }

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
            this._onConnectionChange(data.channelId, data.connectionStatus);
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

    private clientCanConnect(clientUid) : boolean {
        return (!(this.clientConnectedCallbacks.has(clientUid)) && !(this.connectedClients.has(clientUid)));
    }
}

export default FrontChannel;