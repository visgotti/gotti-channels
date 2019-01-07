import { Protocol, PublishProtocol, SubscribeProtocol, PushProtocol, PullProtocol, MessageFactory } from '../Channel/MessageFactory'
import { BackChannel } from './BackChannel';


export interface BackPubs {
    BROADCAST_MIRROR_FRONTS: PublishProtocol,
    BROADCAST_ALL_FRONTS: PublishProtocol;
    SET_STATE: PublishProtocol;
    PATCH_STATE: PublishProtocol
}

export interface BackPushes {
    CONNECTION_CHANGE: PushProtocol,
    SEND_FRONT: PushProtocol,
}

export interface BackSubs {
    SEND_BACK: SubscribeProtocol,
    CONNECT: SubscribeProtocol,
    BROADCAST_ALL_BACK: SubscribeProtocol,
    DISCONNECT: SubscribeProtocol,
}

export interface BackPulls {
    SEND_QUEUED: PullProtocol,
}

export class BackMessages extends MessageFactory {
    public CONNECT: SubscribeProtocol;
    public BROADCAST_ALL_BACK: SubscribeProtocol;
    public DISCONNECT: SubscribeProtocol;
    public SEND_BACK: SubscribeProtocol;

    public SEND_QUEUED: PullProtocol;

    public SEND_FRONT: PushProtocol;

    public CONNECTION_CHANGE: PushProtocol;

    public BROADCAST_MIRROR_FRONTS: PublishProtocol;
    public BROADCAST_ALL_FRONTS: PublishProtocol;
    public SET_STATE:  PublishProtocol;
    public PATCH_STATE: PublishProtocol;

    public push: BackPushes;
    public pub: BackPubs;
    public sub: BackSubs;
    public pull: BackPulls;

    readonly channelId: string;

    constructor(centrum, channel: BackChannel) {
        super(centrum, channel);
        this.centrum = centrum;
        this.channelId = channel.channelId;
        this.pub = this.initializePubs();
        this.sub = this.initializeSubs();
        this.push = this.initializePushes();
        this.pull = this.initializePulls();
    }

    private initializePubs() : BackPubs {
        this.BROADCAST_MIRROR_FRONTS = this.pubCreator(Protocol.BROADCAST_MIRROR_FRONTS(this.channelId));
        this.SET_STATE = this.pubCreator(Protocol.SET_STATE(this.channelId));
        this.PATCH_STATE = this.pubCreator(Protocol.PATCH_STATE(this.channelId));
        this.BROADCAST_ALL_FRONTS = this.pubCreator(Protocol.BROADCAST_ALL_FRONTS());

        return {
            BROADCAST_MIRROR_FRONTS: this.BROADCAST_MIRROR_FRONTS,
            PATCH_STATE: this.SET_STATE,
            SET_STATE: this.PATCH_STATE,
            BROADCAST_ALL_FRONTS: this.BROADCAST_ALL_FRONTS,
        }
    }

    private initializePushes() : BackPushes {
        this.CONNECTION_CHANGE = this.pushCreator(Protocol.CONNECTION_CHANGE);
        this.SEND_FRONT = this.pushCreator(Protocol.SEND_FRONT);
        return {
            SEND_FRONT: this.SEND_FRONT,
            CONNECTION_CHANGE: this.CONNECTION_CHANGE,
        }
    }

    private initializeSubs() : BackSubs {
        this.SEND_BACK = this.subCreator(Protocol.SEND_BACK(this.channelId), this.channelId);
        this.CONNECT = this.subCreator(Protocol.CONNECT(), this.channelId);
        this.DISCONNECT = this.subCreator(Protocol.DISCONNECT(), this.channelId);
        this.BROADCAST_ALL_BACK = this.subCreator(Protocol.BROADCAST_ALL_BACK(), this.channelId);

        return {
            SEND_BACK: this.SEND_BACK,
            CONNECT: this.CONNECT,
            DISCONNECT: this.DISCONNECT,
            BROADCAST_ALL_BACK: this.BROADCAST_ALL_BACK,
        }
    };

    private initializePulls(): BackPulls {
        this.SEND_QUEUED = this.pullCreator(Protocol.SEND_QUEUED);

        return {
            SEND_QUEUED: this.SEND_QUEUED,
        }
    }
}