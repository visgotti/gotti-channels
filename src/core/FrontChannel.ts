import { Channel } from './Channel/Channel';
import { StateData, BackToFrontMessage, MSG_CODES } from './types';

import { Centrum } from '../../lib/Centrum';

type ChannelId = string;

interface HandlerMap {
    send: Function,
    disconnect: Function,
}

type ChannelHandlers = Map <ChannelId, HandlerMap>

export class FrontChannel extends Channel {
    public forwardMessages: Function;

    private remoteChannelIds: Set<string>;

    // publish handlers
    private channelMessageHandlers: ChannelHandlers;
    private sendQueuedHandler: Function;
    private broadcastAllHandler: Function;
    private connectHandler: Function;

    //subscription handlers meant to be overridden with API.
    private onMessageHandler: Function; // overridden in onMessage;
    private onSetStateHandler: Function; // overridden in onSetState;
    private onPatchStateHandler: Function; // overridden in onPatchState;

    private queuedMessages: Array<any>;

    readonly frontUid : string;
    readonly frontServerIndex: number;

    constructor(channelId, frontServerIndex, centrum: Centrum) {
        super(channelId, centrum);
        this.channelMessageHandlers = new Map();
        this.remoteChannelIds = new Set();

        this.queuedMessages = [];
        // front id is used for 1:1 back to front communication.
        this.frontUid = `${channelId}-${frontServerIndex.toString()}`;
        this.frontServerIndex = frontServerIndex;

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
     */
    public addMessage(message: any) : void {
        this.queuedMessages.push(message);
    };

    /**
     * used to publish all queued messages to mirror back channel queuedMessages is emptied when called.
     */
    public sendQueued() : void {
        this.sendQueuedHandler(this.queuedMessages);
        this.queuedMessages.length = 0;
    };

    /**
     * sends message to mirror back channel by default if backChannelId is omitted or sends to remote back channel with specified id.
     * @param message - data sent to back channel.
     * @param backChannelId - id of back channel to send message to
     */
    public send(message: any, backChannelId=this.channelId) : void {
        this.channelMessageHandlers[backChannelId].send(message);
    }

    /**
     * sends message to all specified backChannelIds, if omitted it will send broadcast to all connected remote and mirror back channels.
     * @param message
     * @param backChannelIds
     */
    public broadcast(message: any, backChannelIds?: Array<ChannelId>) : void {
        // we were given channelIds to broadcast specifically to, iterate and use send handler/protocol
        if(backChannelIds) {
            backChannelIds.forEach(channelId => {
               this.send(message, channelId);
            });
        // no backChannels were given so use broadcastAll handler/protocol
        } else {
            this.broadcastAllHandler(message);
        }
    }

    private _onSetState(stateData: StateData) : void  {
        this._setState(stateData);
        this.onSetStateHandler(stateData);
    }

    private onSetStateHandler(stateData: StateData) : void {}

    private _onPatchState(patches: any) : void {
        const stateData = this.patchState(patches);
        this.onPatchStateHandler(patches, stateData);
    }

    private onPatchedStateHandler(patches: any) : void {}

    private _onMessage(message: any, channelId: string) : void {
        this.onMessageHandler(message, channelId);
    }
    private onMessageHandler(message: any, channelId: string) : void {
        throw new Error(`Unimplemented onMessageHandler in front channel ${this.channelId} Use frontChannel.onMessage to implement.`);
    }

    private connect() : void {
        this.connectHandler({ frontUid: this.frontUid, frontServerIndex: this.frontServerIndex, channelId: this.channelId });
    };

    public disconnect(channelId: ChannelId) : void {
    }

    /**
     * subscriptions that we want to register pre connection.
     */
    private initializePreConnectSubs() : void {
        //todo: create some sort of front SERVER class wrapper so we can optimaly handle backChannel -> front SERVER messages (things that not every channel need to handle)
        let handlerName = this.protocol(MSG_CODES.SEND_FRONT_SERVER, this.frontServerIndex);
        this.centrum.createSubscription(handlerName, (data: BackToFrontMessage) => {
            const { message, channelId } = data;
            this._onMessage(message, channelId);
        });

        handlerName = this.protocol(MSG_CODES.SEND_FRONT_CHANNEL, this.frontUid);
        this.centrum.createSubscription(handlerName, (data: BackToFrontMessage) => {
            const { message, channelId } = data;
            this._onMessage(message, channelId);
        });

        handlerName = this.protocol(MSG_CODES.CONNECT_SUCCESS, this.frontUid);
        this.centrum.createSubscription(handlerName, (channelId) => {
            if(data.frontUid === this.frontUid) {
                this.onConnected(channelId);
            }
        })
    }

    /**
     * Publications we initialize before connections are made.
     */
    private initializePreConnectedPubs() : void {
        // channels live on same process so they share centrum instance and can share publishers so check if it exists before creating.
        let handlerName = this.protocol(MSG_CODES.CONNECT);
        if(!(this.centrum.publish[handlerName])) {
            this.centrum.createPublish(handlerName);
        }
        this.connectHandler = this.centrum.publish[protocol];

        handlerName = this.protocol(MSG_CODES.BROADCAST_ALL_BACK);
        if(!(this.centrum.publish[handlerName])) {
            this.centrum.createPublish(handlerName);
        }
        this.broadcastAllHandler = this.centrum.publish[handlerName];
    }

    /**
     * initializes centrum pub and subs when connected
     * @param channelId
     */
    private onConnected(backChannelId) {
        let handlerName;
        if(backChannelId === this.channelId) {
            handlerName = this.protocol(MSG_CODES.PATCH_STATE, this.channelId);
            this.centrum.createSubscription(handlerName, (patches: any) => {
                this._onPatchState(patches);
            });

            handlerName = this.protocol(MSG_CODES.SET_STATE, this.channelId);
            this.centrum.createSubscription(handlerName, (stateData: StateData) => {
                this._onSetState(stateData);
            });

            // for when back broadcasts to all mirror fronts
            handlerName = this.protocol(MSG_CODES.BROADCAST_MIRROR_FRONTS, this.channelId);
            this.centrum.createSubscription(handlerName, (message: any) => {
                this._onMessage(message, this.channelId);
            });

            // for when back broadcasts to all channels
            handlerName = this.protocol(MSG_CODES.BROADCAST_ALL_FRONTS);
            this.centrum.createSubscription(handlerName, (data: any) => {
                this._onMessage(data.message, data.channelId);
            });

            // connected channel was mirror, register sendQueued
            handlerName = this.protocol(MSG_CODES.SEND_QUEUED, this.frontUid);
            this.sendQueuedHandler = this.centrum.createPublish(handlerName);
        }

        this.channelMessageHandlers.set(backChannelId, new Map() as HandlerMap);
        const handlerMap = this.channelMessageHandlers.get(backChannelId);

        let handlerName = this.protocol(MSG_CODES.SEND_BACK, backChannelId);
        const sendHandler = this.centrum.createPublish(handlerName, (message => {
            return {
                frontUid: this.frontUid,
                message,
            }
        }));
        handlerMap.set('send', sendHandler);

        handlerName = this.protocol(MSG_CODES.DISCONNECT, backChannelId);
        const disconnectHandler = this.centrum.createPublish(handlerName, (message => {
            return {
                frontUid: this.frontUid,
                message,
            }
        }));

        handlerMap.set('disconnect', disconnectHandler);
    }
}