import { Protocol, PublishProtocol, SubscribeProtocol, PushProtocol, PullProtocol, MessageFactory } from '../Channel/MessageFactory'
import { FrontChannel } from './FrontChannel';

export interface FrontPubs {
    CONNECT: PublishProtocol,
    SEND_QUEUED: PublishProtocol,
    BROADCAST_ALL_BACK: PublishProtocol,
}

export interface FrontSubs {
    CONNECT_SUCCESS: SubscribeProtocol,
    SEND_FRONT: SubscribeProtocol,
    BROADCAST_MIRROR_FRONTS: SubscribeProtocol,
}

export interface FrontPushes {
    SEND_BACK: PushProtocol,
    DISCONNECT: PushProtocol,
}

export interface FrontPulls {}

export class FrontMessages extends MessageFactory {
    public SEND_QUEUED: PublishProtocol;
    public CONNECT: PublishProtocol;
    public BROADCAST_ALL_BACK: PublishProtocol;
    public DISCONNECT: PublishProtocol;

    public SEND_BACK: PushProtocol;

    public CONNECT_SUCCESS: SubscribeProtocol;
    public CONNECT_FAILED: SubscribeProtocol;
    public BROADCAST_MIRROR_FRONTS: SubscribeProtocol;
    public BROADCAST_ALL_FRONTS: SubscribeProtocol;
    public SET_STATE:  SubscribeProtocol;
    public PATCH_STATE: SubscribeProtocol;
    public SEND_FRONT: SubscribeProtocol;

    public push: FrontPushes;
    public pub: FrontPubs;
    public sub: FrontSubs;

    readonly frontUid: string;
    readonly channelId: string;

    constructor(centrum, channel: FrontChannel) {
        super(centrum, channel);
        this.centrum = centrum;
        this.frontUid = channel.frontUid;
        this.channelId = channel.channelId;

        this.pub = this.initializePubs();
        this.push = this.initializePushes();
        this.sub = this.initializeSubs();
    }

    private initializePubs() : FrontPubs {
        this.CONNECT = this.pubCreator(Protocol.CONNECT());
        this.SEND_QUEUED = this.pubCreator(Protocol.SEND_QUEUED(this.frontUid));
        this.BROADCAST_ALL_BACK = this.pubCreator(Protocol.BROADCAST_ALL_BACK());

        //todo figure out cleanest way to do this inside parent class implicitly
        return {
            CONNECT: this.CONNECT,
            SEND_QUEUED: this.SEND_QUEUED,
            BROADCAST_ALL_BACK: this.BROADCAST_ALL_BACK,
        }
    }

    private initializePushes() : FrontPushes {
        this.SEND_BACK = this.pushCreator(Protocol.SEND_BACK);
        this.DISCONNECT = this.pushCreator(Protocol.DISCONNECT);

        return {
            SEND_BACK: this.SEND_BACK,
            DISCONNECT: this.DISCONNECT,
        }
    }

    private initializeSubs() : FrontSubs{
        this.CONNECT_SUCCESS = this.subCreator(Protocol.CONNECT_SUCCESS(this.frontUid), this.frontUid);
        this.SEND_FRONT = this.subCreator(Protocol.SEND_FRONT(this.frontUid), this.frontUid);
        this.BROADCAST_MIRROR_FRONTS = this.subCreator(Protocol.BROADCAST_MIRROR_FRONTS(this.channelId), this.frontUid);

        return {
            CONNECT_SUCCESS: this.CONNECT_SUCCESS,
            SEND_FRONT: this.SEND_FRONT,
            BROADCAST_MIRROR_FRONTS: this.BROADCAST_MIRROR_FRONTS,
        }
    }
}