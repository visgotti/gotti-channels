import { Protocol, PublishProtocol, SubscribeProtocol, PushProtocol, PullProtocol, ChannelMessageFactory } from '../../Channel/MessageFactory';
import FrontChannel from './FrontChannel';

export interface FrontPubs {
    CONNECT: PublishProtocol,
    DISCONNECT: PublishProtocol,
    BROADCAST_ALL_BACK: PublishProtocol,
    LINK: PublishProtocol,
    UNLINK: PublishProtocol,
}

export interface FrontSubs {
    CONNECTION_CHANGE: SubscribeProtocol,
    SEND_FRONT: SubscribeProtocol,
    BROADCAST_LINKED_FRONTS: SubscribeProtocol,
    BROADCAST_ALL_FRONTS: SubscribeProtocol,
    SEND_STATE: SubscribeProtocol,
    ACCEPT_LINK: SubscribeProtocol,
}

export interface FrontPushes {
    SEND_BACK: PushProtocol,
}

export class FrontMessages extends ChannelMessageFactory {
    public CONNECT: PublishProtocol;
    public BROADCAST_ALL_BACK: PublishProtocol;
    public DISCONNECT: PublishProtocol;
    public LINK: PublishProtocol;
    public UNLINK: PublishProtocol;

    public SEND_BACK: PushProtocol;

    public CONNECTION_CHANGE: SubscribeProtocol;
    public BROADCAST_LINKED_FRONTS: SubscribeProtocol;
    public BROADCAST_ALL_FRONTS: SubscribeProtocol;
    public SEND_FRONT: SubscribeProtocol;
    public SEND_STATE:  SubscribeProtocol;
    public ACCEPT_LINK:  SubscribeProtocol;

    public push: FrontPushes;
    public pub: FrontPubs;
    public sub: FrontSubs;

    readonly frontUid: string;
    readonly channelId: string;

    constructor(messenger, channel: FrontChannel) {
        super(messenger);
        this.frontUid = channel.frontUid;
        this.channelId = channel.channelId;

        this.pub = this.initializePubs();
        this.push = this.initializePushes();
        this.sub = this.initializeSubs();
    }

    private initializePubs() : FrontPubs {
        this.CONNECT = this.pubCreator(Protocol.CONNECT());
        this.DISCONNECT = this.pubCreator(Protocol.DISCONNECT());
        this.BROADCAST_ALL_BACK = this.pubCreator(Protocol.BROADCAST_ALL_BACK());
        this.LINK = this.pubCreator(Protocol.LINK(this.frontUid));
        this.UNLINK = this.pubCreator(Protocol.UNLINK(this.frontUid));

        //todo figure out cleanest way to do this inside parent class implicitly
        return {
            CONNECT: this.CONNECT,
            DISCONNECT: this.DISCONNECT,
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
        this.SEND_FRONT = this.subCreator(Protocol.SEND_FRONT(this.frontUid), this.frontUid);
        this.SEND_STATE = this.subCreator(Protocol.SEND_STATE(this.frontUid), this.frontUid);
        this.ACCEPT_LINK = this.subCreator(Protocol.ACCEPT_LINK(this.frontUid), this.frontUid);
        this.CONNECTION_CHANGE = this.subCreator(Protocol.CONNECTION_CHANGE(this.frontUid), this.frontUid);
        this.BROADCAST_ALL_FRONTS = this.subCreator(Protocol.BROADCAST_ALL_FRONTS(), this.frontUid);
        this.BROADCAST_LINKED_FRONTS = this.subCreator(Protocol.BROADCAST_LINKED_FRONTS(this.frontUid), this.frontUid);

        return {
            SEND_FRONT: this.SEND_FRONT,
            SEND_STATE: this.SEND_STATE,
            ACCEPT_LINK: this.ACCEPT_LINK,
            CONNECTION_CHANGE: this.CONNECTION_CHANGE,
            BROADCAST_ALL_FRONTS: this.BROADCAST_ALL_FRONTS,
            BROADCAST_LINKED_FRONTS: this.BROADCAST_LINKED_FRONTS,
        }
    }
}