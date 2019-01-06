import { Channel } from '../Channel/Channel';
import { Centrum } from '../../../lib/Centrum';
import { FrontMessages } from './FrontMessages';

import { Protocol } from '../Channel/Messages';

import { StateData, ChannelHandlers, BackToFrontMessage } from '../types';

import {clearTimeout} from "timers";

enum CONNECTION_STATUS {
    DISCONNECTED = 'DISCONNECTED',
    DISCONNECTING = 'DISCONNECTING',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
}
enum CONNECTION_CHANGE {
    CONNECTED = CONNECTION_STATUS.CONNECTED,
    DISCONNECTED = CONNECTION_CHANGE.DISCONNECTED,
}

export class FrontChannel extends Channel {
    public forwardMessages: Function;

    private connectedChannelIds: Set<string>;
    private _connectionInfo: any;

    private frontMessages: FrontMessages;

    private queuedMessages: Array<any>;

    readonly frontUid : string;
    readonly frontServerIndex: number;

    private CONNECTION_STATUS: CONNECTION_STATUS;

    // count of total the front channel can be communicating with
    readonly totalChannels: number;

    constructor(channelId, frontServerIndex, totalChannels, centrum: Centrum) {
        super(channelId, centrum);

        this.CONNECTION_STATUS = CONNECTION_STATUS.DISCONNECTED;

        this.connectedChannelIds = new Set();

        this.queuedMessages = [];

        // front id is used for 1:1 back to front communication.
        this.frontUid = `${channelId}-${frontServerIndex.toString()}`;
        this.frontServerIndex = frontServerIndex;
        this.totalChannels = totalChannels;

        this.frontMessages = new FrontMessages(centrum, this);

        this.initializePreConnectedPubs();
        this.initializePreConnectSubs();
    };

    /**
     * sets the setStateHandler function
     * @param handler - function that gets executed when mirror back channel sends whole state
     */
    public onSetState(handler: (newState: StateData) => void) : void {
        this.onSetStateHandler = handler;
    };

    /**
     * sets the patchStateHandler function
     * @param handler - function that gets executed after channel receives and applies patched state from .
     */
    public onPatchState(handler: (patches: any, updatedState: StateData) => void) : void {
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
        this.frontMessages.SEND_QUEUED(this.queuedMessages);
        this.clearQueued();
    };

    /**
     * sends message to mirror back channel by default if backChannelId is omitted or sends to remote back channel with specified id.
     * @param message - data sent to back channel.
     * @param backChannelId - id of back channel to send message to
     */
    public send(message: any, backChannelId=this.channelId) : void {
        let data = { message,  frontUid: this.frontUid };
        this.frontMessages.SEND_BACK[backChannelId](data);
    }

    /**
     * sends message to all specified backChannelIds, if omitted it will send broadcast to all connected remote and mirror back channels.
     * @param message
     * @param backChannelIds
     */
    public broadcast(message: any, backChannelIds?: Array<string>) : void {
        // we were given channelIds to broadcast specifically to, iterate and use send handler/protocol
        if(backChannelIds) {
            backChannelIds.forEach(channelId => {
               this.send(message, channelId);
            });
        // no backChannels were given so use broadcastAll handler/protocol
        } else {
            //this.broadcastAllHandler({ frontUid: this.frontUid, message });
            this.frontMessages.BROADCAST_ALL_BACK({ frontUid: this.frontUid, message  })
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

            this.frontMessages.CONNECT({
                frontUid: this.frontUid,
                frontServerIndex: this.frontServerIndex,
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
        const awaitingChannelIds =  new Set(channelIds) || this.connectedChannelIds;
        const disconnectionsLength = awaitingChannelIds.size;
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

    private _onSetState(stateData: StateData) : void  {
        this._setState(stateData);
        this.onSetStateHandler(stateData);
    }
    private onSetStateHandler(stateData: StateData) : void {}

    private _onPatchState(patches: any) : void {
        const stateData = this.patchState(patches);
        this.onPatchedStateHandler(patches, stateData);
    }
    private onPatchedStateHandler(patches: any, stateData: StateData) : void {}

    private _onMessage(message: any, channelId: string) : void {
        this.onMessageHandler(message, channelId);
    }
    private onMessageHandler(message: any, channelId: string) : void {
        throw new Error(`Unimplemented onMessageHandler in front channel ${this.channelId} Use frontChannel.onMessage to implement.`);
    }

    private validateConnectAction(REQUEST_STATUS: CONNECTION_STATUS) : { success: boolean, error?: string } {
        let validated = { success: true, error: null };
        if(this.CONNECTION_STATUS === CONNECTION_STATUS.CONNECTING) {
            validated.success = true;
            validated.error = 'Channel is in the process of connecting';
        }

        if(this.CONNECTION_STATUS === CONNECTION_STATUS.DISCONNECTING) {
            validated.success = true;
            validated.error = 'Channel is in the process of disconnecting.';
        }

        this.CONNECTION_STATUS = REQUEST_STATUS;

        return validated;
    }

    get connectionInfo(): any {
        return {
            connectedChannelIds: Array.from(this.connectedChannelIds),
            connectionStatus: this.CONNECTION_STATUS,
        }
    }

    /**
     * subscriptions that we want to register pre connection.
     */
    private initializePreConnectSubs() : void {
        //todo: create some sort of front SERVER class wrapper so we can optimaly handle backChannel -> front SERVER messages (things that not every channel need to handle)
        this.frontMessages.SEND_FRONT.createSub(data => {
            this._onMessage(data.message, data.channelId);
        });

        this.frontMessages.CONNECT_SUCCESS.createSub(this.onConnected.bind(this));
    }

    /**
     * Publications we initialize before connections are made.
     */
    private initializePreConnectedPubs() : void {
        this.frontMessages.CONNECT.createPub();
        this.frontMessages.BROADCAST_ALL_BACK.createPub();
    }

    /**
     * initializes centrum pub and subs when connected
     * @param backChannelId
     */
    private onConnected(backChannelId) {
        // channelId of connected backChannel was the same so register pub/subs meant for mirrored channels.
        if(backChannelId === this.channelId) {

            /*
            this.centrum.createOrAddSubscription(Protocol.PATCH_STATE(this.channelId), (patches: any) => {
                this._onPatchState(patches);
            });

            this.centrum.createOrAddSubscription(Protocol.SET_STATE(this.channelId), (stateData: StateData) => {
                this._onSetState(stateData);
            });
            */

            // for when back broadcasts to all mirror fronts

            /*
            this.centrum.createOrAddSubscription(Protocol.BROADCAST_MIRROR_FRONTS(this.channelId), (message: any) => {
                this._onMessage(message, this.channelId);
            });

            // for when back broadcasts to all channels
            this.centrum.createOrAddSubscription(Protocol.BROADCAST_ALL_FRONTS(), (data: any) => {
                this._onMessage(data.message, data.channelId);
            });
            */
            this.frontMessages.SEND_QUEUED.createPub();
        }
        this.frontMessages.SEND_BACK.createMultiPub(backChannelId);

        /*
        const disconnectHandler = this.centrum.getOrCreatePublish(Protocol.DISCONNECT(backChannelId), (fromFrontId, message) => {
            return {
                frontUid: fromFrontId,
                message,
            }
        });
        */

        this.emit('connected', backChannelId);
    }

    /*
    private onDisconnected(backChannelId) {
        // channelId of connected backChannel was the same so register pub/subs meant for mirrored channels.
        if(backChannelId === this.channelId) {

            this.centrum.removeSubscriptions(Protocol.PATCH_STATE(this.channelId));
            this.centrum.removeSubscriptions(Protocol.SET_STATE(this.channelId));


            // for when back broadcasts to all mirror fronts
            this.centrum.removeAllSubscriptions(Protocol.BROADCAST_MIRROR_FRONTS(this.channelId), (message: any) => {
                this._onMessage(message, this.channelId);
            });

            // for when back broadcasts to all channels
            this.centrum.removeSubscription(Protocol.BROADCAST_ALL_FRONTS(), (data: any) => {
                this._onMessage(data.message, data.channelId);
            });


            //remove sendQueued
            this.frontMessages.SEND_QUEUED.removePublish();
        }

        // check to see if following publishers were already initialized for centrum instance.
        const sendHandler = this.centrum.getOrCreatePublish(Protocol.SEND_BACK(backChannelId), (fromFrontId, message) => {
            return {
                frontUid: fromFrontId,
                message,
            }
        });

        const disconnectHandler = this.centrum.getOrCreatePublish(Protocol.DISCONNECT(backChannelId), (fromFrontId, message) => {
            return {
                frontUid: fromFrontId,
                message,
            }
        });

        //TODO see if i can bind these uniquely with this.frontUid as first param
        this.channelMessageHandlers.set(backChannelId, {
            'send': sendHandler,
            'disconnect': disconnectHandler
        });

        this.emit('connected', backChannelId);
    }
    */
}