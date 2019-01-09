import { Protocol, PublishProtocol, SubscribeProtocol, PushProtocol, PullProtocol, MessageFactory } from '../Channel/MessageFactory'
import FrontChannel from './FrontChannel';

export interface FrontPubs {
    CONNECT: PublishProtocol,
    DISCONNECT: PublishProtocol,
    SEND_QUEUED: PublishProtocol,
    BROADCAST_ALL_BACK: PublishProtocol,
    LINK: PublishProtocol,
    UNLINK: PublishProtocol,
}

export interface FrontSubs {
    CONNECTION_CHANGE: SubscribeProtocol,
    SEND_FRONT: SubscribeProtocol,
    BROADCAST_LINKED_FRONTS: SubscribeProtocol,
    BROADCAST_ALL_FRONTS: SubscribeProtocol,
    PATCH_STATE: SubscribeProtocol,
    SET_STATE: SubscribeProtocol,
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
    public LINK: PublishProtocol;
    public UNLINK: PublishProtocol;

    public SEND_BACK: PushProtocol;

    public CONNECTION_CHANGE: SubscribeProtocol;
    public BROADCAST_LINKED_FRONTS: SubscribeProtocol;
    public BROADCAST_ALL_FRONTS: SubscribeProtocol;
    public SET_STATE:  SubscribeProtocol;
    public PATCH_STATE: SubscribeProtocol;
    public SEND_FRONT: SubscribeProtocol;

    public push: FrontPushes;
    public pub: FrontPubs;
    public sub: FrontSubs;

    readonly frontUid: string;
    readonly channelId: string;

    constructor(messenger, channel: FrontChannel) {
        super(messenger, channel);
        this.messenger = messenger;
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
        this.LINK = this.pubCreator(Protocol.LINK(this.frontUid));
        this.UNLINK = this.pubCreator(Protocol.UNLINK(this.frontUid));

        //todo figure out cleanest way to do this inside parent class implicitly
        return {
            CONNECT: this.CONNECT,
            DISCONNECT: this.DISCONNECT,
            SEND_QUEUED: this.SEND_QUEUED,
            BROADCAST_ALL_BACK: this.BROADCAST_ALL_BACK,
            LINK: this.LINK,
            UNLINK: this.UNLINK,
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
        this.BROADCAST_ALL_FRONTS = this.subCreator(Protocol.BROADCAST_ALL_FRONTS(), this.frontUid);
        this.SET_STATE = this.subCreator(Protocol.SET_STATE(this.frontUid), this.frontUid);
        this.PATCH_STATE = this.subCreator(Protocol.PATCH_STATE(this.frontUid), this.frontUid, 'NONE');
        this.BROADCAST_LINKED_FRONTS = this.subCreator(Protocol.BROADCAST_LINKED_FRONTS(this.frontUid), this.frontUid);

        return {
            CONNECTION_CHANGE: this.CONNECTION_CHANGE,
            SEND_FRONT: this.SEND_FRONT,
            BROADCAST_LINKED_FRONTS: this.BROADCAST_LINKED_FRONTS,
            BROADCAST_ALL_FRONTS: this.BROADCAST_ALL_FRONTS,
            SET_STATE: this.SET_STATE,
            PATCH_STATE: this.PATCH_STATE,
        }
    }
}