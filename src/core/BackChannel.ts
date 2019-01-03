import { Channel } from './Channel/Channel';
import { StateData, FrontToBackMessage, FrontConnectMessage, MSG_CODES } from './types';

import { Centrum } from '../../lib/Centrum';

type FrontUid = string;
type FrontServerIndex = number;

interface FrontHandlerMap {
    send: Function,
}

type FrontServerLookup = Map <FrontUid, FrontServerIndex>
type ChannelHandlers = Map <FrontUid, FrontHandlerMap>

export class BackChannel extends Channel {
    // publish handlers
    private channelMessageHandlers: ChannelHandlers;
    private broadcastAllHandler: Function;
    private broadcastMirrorHandler: Function;
    private sendSetStateHandler: Function;
    private sendPatchedStateHandler: Function;

    private frontServerLookup: FrontServerLookup;
    private mirroredChannels: MirroredChannels;

    constructor() {
        this.frontServerLookup = new Map() as FrontServerLookup;

        this.initializePreConnectSubs();
        this.initializePreConnectPubs();
    }

    /**
     * sets the onMessageHandler function
     * @param handler - function that gets executed, gets parameters message and frontUid
     */
    public onMessage(handler: (message: any, frontUid: string) => void) : void {
        this.onMessageHandler = handler;
    }

    public broadcastPatchedState() {
        this.sendPatchedStateHandler();
    };

    public broadcastSetState(){
        this.sendSetStateHandler();
    };

    /**
     * sends message to specific front channel based on frontUid
     * @param message - data sent to back channel.
     * @param backChannelId - id of back channel to send message to
     */
    public send(message: any, frontUid) : void {
        this.channelMessageHandlers[backChannelId].send(message);
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
            this.broadcastAllHandler(message)
        }
    }

    /**
     * sends message to all front channels that share channelId with back channel.
     * @param message
     * @param frontUids
     */
    public broadcastMirrored(message: any) {
        this.broadcastMirrorHandler(message);
    }

    private onMessageQueue(messages: Array<any>, frontUid: string) {
        for(let i = 0; i < messages.length; i++) {
            this._onMessage(messages[i], frontUid);
        }
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
    private initializePreConnectSubs() : void {
        // registers sub that handles a front channel connection request.
        let handlerName = this.protocol(MSG_CODES.CONNECT, this.frontServerIndex);
        this.centrum.createSubscription(handlerName, (data: FrontConnectMessage) => {
            this.onFrontChannelConnected(data);
        });

        handlerName = this.protocol(MSG_CODES.SEND_BACK, this.frontUid);
        this.centrum.createSubscription(handlerName, (data: FrontToBackMessage) => {
            const { message, frontUid } = data;
            this._onMessage(message, frontUid);
        });

        handlerName = this.protocol(MSG_CODES.BROADCAST_ALL_BACK);
        this.centrum.createSubscription(handlerName, (data: FrontToBackMessage) => {
            const { message, frontUid } = data;
            this._onMessage(message, frontUid);
        });
    }

    /**
     * publications that we want to be able to send out before channels start connecting.
     */
    private initializePreConnectPubs() : void {
        const protocol = this.protocol;

        let handlerName = this.protocol(MSG_CODES.BROADCAST_ALL_FRONTS);
        this.broadcastAllHandler = this.centrum.createPublish(handlerName, (message: any) => {
            return {
                channelId: this.channelId,
                message,
            }
        });

        handlerName = this.protocol(MSG_CODES.BROADCAST_MIRROR_FRONTS, this.channelId);
        this.broadcastAllHandler = this.centrum.createPublish(handlerName);
    }

    /**
     * initializes channel pub and sub  handlers when we receive a connect message from front channel.
     * @param frontData - { channelId, frontUid, frontServerIndex }
     */
    private onFrontChannelConnected(frontData: FrontConnectMessage) {
        const { channelId, frontUid, frontServerIndex } = frontData;
        let handlerName;

        if(channelId === this.channelId) {
            handlerName = this.protocol(MSG_CODES.SEND_QUEUED, frontUid);
            this.centrum.createSubscription(handlerName, (messages => {
                this.onMessageHandler(messages, frontUid);
            }));
        }

        this.frontServerLookup.set(frontUid, frontServerIndex);
        this.channelMessageHandlers.set(frontUid, new Map() as FrontHandlerMap);

        const handlerMap = this.channelMessageHandlers.get(frontUid);
        const sendHandler = this.centrum.createPublish(this.protocol(MSG_CODES.SEND_FRONT, frontUid), message => {
            return {
                channelId: this.channelId,
                message,
            }
        });
        handlerMap.set('send', sendHandler);

        // create the confirm request publisher, send the message, then remove publisher since it wont
        // be used again unless it disconnects and connects again, then it will do same process.
        let handlerName = this.protocol(MSG_CODES.CONNECT_SUCCESS, frontUid);
        this.centrum.createPublish(handlerName);
        this.centrum.publish[handlerName];
        this.centrum.removePublish(handlerName);
    }
}