import { Protocol, PublishProtocol, SubscribeProtocol, PushProtocol, PullProtocol, MessageFactory } from '../Channel/MessageFactory'
import FrontChannel from './FrontChannel';

export interface FrontPubs {
    CONNECT: PublishProtocol,
    DISCONNECT: PublishProtocol,
    SEND_QUEUED: PublishProtocol,
    BROADCAST_ALL_BACK: PublishProtocol,
}

export interface FrontSubs {
    CONNECTION_CHANGE: SubscribeProtocol,
    SEND_FRONT: SubscribeProtocol,
    BROADCAST_MIRROR_FRONTS: SubscribeProtocol,
    BROADCAST_ALL_FRONTS: SubscribeProtocol,
}

export interface FrontPushes {
    SEND_BACK: PushProtocol,
}

export interface FrontPulls {}

export class FrontMessages extends MessageFactory {
    public SEND_QUEUED: PublishProtocol;
    public CONNECT: PublishProtocol;
    public BROADCAST_ALL_BACK: PublishProtocol;
    public DISCONNECT: PublishProtocol;

    public SEND_BACK: PushProtocol;

    public CONNECTION_CHANGE: SubscribeProtocol;
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
        this.DISCONNECT = this.pubCreator(Protocol.DISCONNECT());
        this.SEND_QUEUED = this.pubCreator(Protocol.SEND_QUEUED(this.frontUid));
        this.BROADCAST_ALL_BACK = this.pubCreator(Protocol.BROADCAST_ALL_BACK());

        //todo figure out cleanest way to do this inside parent class implicitly
        return {
            CONNECT: this.CONNECT,
            DISCONNECT: this.DISCONNECT,
            SEND_QUEUED: this.SEND_QUEUED,
            BROADCAST_ALL_BACK: this.BROADCAST_ALL_BACK,
        }
    }

    private initializePushes() : FrontPushes {
        this.SEND_BACK = this.pushCreator(Protocol.SEND_BACK);

        return {
            SEND_BACK: this.SEND_BACK,
        }
    }

    private initializeSubs() : FrontSubs {
        this.CONNECTION_CHANGE = this.subCreator(Protocol.CONNECTION_CHANGE(this.frontUid), this.frontUid);
        this.SEND_FRONT = this.subCreator(Protocol.SEND_FRONT(this.frontUid), this.frontUid);
        this.BROADCAST_MIRROR_FRONTS = this.subCreator(Protocol.BROADCAST_MIRROR_FRONTS(this.channelId), this.frontUid);
        this.BROADCAST_ALL_FRONTS = this.subCreator(Protocol.BROADCAST_ALL_FRONTS(), this.frontUid);

        return {
            CONNECTION_CHANGE: this.CONNECTION_CHANGE,
            SEND_FRONT: this.SEND_FRONT,
            BROADCAST_MIRROR_FRONTS: this.BROADCAST_MIRROR_FRONTS,
            BROADCAST_ALL_FRONTS: this.BROADCAST_ALL_FRONTS,
        }
    }
}