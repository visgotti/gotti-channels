import { Protocol, PublishProtocol, SubscribeProtocol, PushProtocol, PullProtocol, ChannelMessageFactory } from '../Channel/MessageFactory'
import BackChannel from './BackChannel';


export interface BackPubs {
    BROADCAST_ALL_FRONTS: PublishProtocol;
}

export interface BackPushes {
    CONNECTION_CHANGE: PushProtocol,
    SEND_FRONT: PushProtocol,
    BROADCAST_LINKED_FRONTS: PushProtocol,
    SEND_STATE: PushProtocol
}

export interface BackSubs {
    SEND_BACK: SubscribeProtocol,
    CONNECT: SubscribeProtocol,
    BROADCAST_ALL_BACK: SubscribeProtocol,
    DISCONNECT: SubscribeProtocol,
}

export interface BackPulls {
    LINK: PullProtocol,
    UNLINK: PullProtocol,
}

export class BackMessages extends ChannelMessageFactory {
    public CONNECT: SubscribeProtocol;
    public BROADCAST_ALL_BACK: SubscribeProtocol;
    public DISCONNECT: SubscribeProtocol;
    public SEND_BACK: SubscribeProtocol;

    public LINK: PullProtocol;
    public UNLINK: PullProtocol;

    public SEND_FRONT: PushProtocol;

    public CONNECTION_CHANGE: PushProtocol;

    public BROADCAST_LINKED_FRONTS: PublishProtocol;
    public BROADCAST_ALL_FRONTS: PublishProtocol;
    public SEND_STATE:  PublishProtocol;

    public push: BackPushes;
    public pub: BackPubs;
    public sub: BackSubs;
    public pull: BackPulls;

    readonly channelId: string;

    constructor(messenger, channel: BackChannel) {
        super(messenger, channel);
        this.messenger = messenger;
        this.channelId = channel.channelId;
        this.pub = this.initializePubs();
        this.sub = this.initializeSubs();
        this.push = this.initializePushes();
        this.pull = this.initializePulls();
    }

    private initializePubs() : BackPubs {
        this.BROADCAST_ALL_FRONTS = this.pubCreator(Protocol.BROADCAST_ALL_FRONTS());

        return {
            BROADCAST_ALL_FRONTS: this.BROADCAST_ALL_FRONTS,
        }
    }

    private initializePushes() : BackPushes {
        this.CONNECTION_CHANGE = this.pushCreator(Protocol.CONNECTION_CHANGE);
        this.SEND_FRONT = this.pushCreator(Protocol.SEND_FRONT);
        this.BROADCAST_LINKED_FRONTS = this.pushCreator(Protocol.BROADCAST_LINKED_FRONTS);
        this.SEND_STATE = this.pushCreator(Protocol.SEND_STATE); // encoding for states happen in the back channel business logic

        return {
            SEND_FRONT: this.SEND_FRONT,
            CONNECTION_CHANGE: this.CONNECTION_CHANGE,
            BROADCAST_LINKED_FRONTS: this.BROADCAST_LINKED_FRONTS,
            SEND_STATE: this.SEND_STATE,
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
        this.LINK = this.pullCreator(Protocol.LINK);
        this.UNLINK = this.pullCreator(Protocol.UNLINK);

        return {
            LINK: this.LINK,
            UNLINK: this.UNLINK,
        }
    }
}