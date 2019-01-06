import { Centrum } from '../../../lib/Centrum';

import { Channel } from '../Channel/Channel';
import { Protocol } from '../Channel/Messages';

import { FrontServerLookup, FrontToBackMessage, FrontConnectMessage, ChannelHandlers } from '../types';

export class BackChannel extends Channel {
    // publish handlers
    private channelMessageHandlers: ChannelHandlers;
    private broadcastAllHandler: Function;
    private broadcastMirrorHandler: Function;
    private sendSetStateHandler: Function;
    private sendPatchedStateHandler: Function;

    private frontServerLookup: FrontServerLookup;

    constructor(channelId, centrum: Centrum) {
        super(channelId, centrum);

        this.frontServerLookup = new Map() as FrontServerLookup;
        this.channelMessageHandlers = new Map() as ChannelHandlers;

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
     * @param frontUid - uid of front channel to send message to
     */
    public send(message: any, frontUid: string) : void {
        this.channelMessageHandlers.get(frontUid).send(this.channelId, message);
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
            this.broadcastAllHandler(this.channelId, message)
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
        // since back channels share instance of centrum we use createOrAddSubscription
        // to add the backChannels instance methods as handlers.
        this.centrum.createOrAddSubscription(Protocol.CONNECT(), this.channelId, (data: FrontConnectMessage) => {
            this.onFrontChannelConnected(data);
        });

        this.centrum.createOrAddSubscription(Protocol.BROADCAST_ALL_BACK(), this.channelId, (data: FrontToBackMessage) => {
            const { message, frontUid } = data;
            this._onMessage(message, frontUid);
        });

        this.centrum.createSubscription(Protocol.SEND_BACK(this.channelId), this.channelId, (data: FrontToBackMessage) => {
            const { message, frontUid } = data;
            this._onMessage(message, frontUid);
        });
    }

    /**
     * publications that we want to be able to send out before channels start connecting.
     */
    private initializePreConnectPubs() : void {
        // handler that broadcasts instance already exists on centrum before creating it if its not the first backChannel instantiated
        this.broadcastAllHandler = this.centrum.getOrCreatePublish(Protocol.BROADCAST_ALL_FRONTS(), (fromChannelId, message: any) => {
            return {
                channelId: fromChannelId,
                message,
            }
        });

        this.broadcastMirrorHandler = this.centrum.createPublish(Protocol.BROADCAST_MIRROR_FRONTS(this.channelId));
    }

    /**
     * initializes channel pub and sub  handlers when we receive a connect message from front channel.
     * @param frontData - { channelId, frontUid, frontServerIndex }
     */
    private onFrontChannelConnected(frontData: FrontConnectMessage) {
        const { channelId, frontUid, frontServerIndex } = frontData;
        if(channelId === this.channelId) {
            // channelId of connecting frontChannel was the same so register pub/subs meant for mirrored channels.
            this.centrum.createSubscription(Protocol.SEND_QUEUED(frontUid), frontUid, (messages => {
                for(let i = 0; i < messages.length; i++) {
                    this.onMessageHandler(messages[i], frontUid);
                }
            }));
        }

        this.frontServerLookup.set(frontUid, frontServerIndex);

        this.channelMessageHandlers.set(frontUid, {
            'send':  this.centrum.getOrCreatePublish(Protocol.SEND_FRONT(frontUid), (backChannelId, message) => {
                return {
                    channelId: backChannelId,
                    message,
                }
            })
        });

        // create the confirm request publisher, send the message, then remove publisher since it wont
        // be used again unless it disconnects and connects again, then it will do same process.
        let _connectSuccessProtocol = Protocol.CONNECT_SUCCESS(frontUid);
        this.centrum.createPublish(_connectSuccessProtocol);
        this.centrum.publish[_connectSuccessProtocol](this.channelId);
        this.centrum.removePublish(_connectSuccessProtocol);
    }
}