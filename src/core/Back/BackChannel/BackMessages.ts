import { Protocol, PublishProtocol, SubscribeProtocol, PushProtocol, PullProtocol, ChannelMessageFactory } from '../../Channel/MessageFactory';
import BackChannel from './BackChannel';


export interface BackPubs {
    BROADCAST_ALL_FRONTS: PublishProtocol;
}

export interface BackPushes {
    CONNECTION_CHANGE: PushProtocol,
    SEND_FRONT: PushProtocol,
    BROADCAST_LINKED_FRONTS: PushProtocol,
    ACCEPT_LINK: PushProtocol,
}

export interface BackSubs {
    SEND_BACK: SubscribeProtocol,
    CONNECT: SubscribeProtocol,
    BROADCAST_ALL_BACK: SubscribeProtocol,
}

export interface BackPulls {
    LINK: PullProtocol,
    UNLINK: PullProtocol,
    ADD_CLIENT_WRITE: PullProtocol,
    REMOVE_CLIENT_WRITE: PullProtocol,
}

export class BackMessages extends ChannelMessageFactory {
    public CONNECT: SubscribeProtocol;
    public BROADCAST_ALL_BACK: SubscribeProtocol;
    public SEND_BACK: SubscribeProtocol;

    public LINK: PullProtocol;
    public UNLINK: PullProtocol;
    public ADD_CLIENT_WRITE: PullProtocol;
    public REMOVE_CLIENT_WRITE: PullProtocol;

    public SEND_FRONT: PushProtocol;

    public CONNECTION_CHANGE: PushProtocol;

    public BROADCAST_LINKED_FRONTS: PublishProtocol;
    public BROADCAST_ALL_FRONTS: PublishProtocol;
    public ACCEPT_LINK:  PublishProtocol;

    public push: BackPushes;
    public pub: BackPubs;
    public sub: BackSubs;
    public pull: BackPulls;

    readonly channelId: string;

    constructor(messenger, channel: BackChannel) {
        super(messenger);
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
        this.ACCEPT_LINK = this.pushCreator(Protocol.ACCEPT_LINK); // encoding for states happen in the back channel business logic

        return {
            SEND_FRONT: this.SEND_FRONT,
            CONNECTION_CHANGE: this.CONNECTION_CHANGE,
            BROADCAST_LINKED_FRONTS: this.BROADCAST_LINKED_FRONTS,
            ACCEPT_LINK: this.ACCEPT_LINK,
        }
    }

    private initializeSubs() : BackSubs {
        this.SEND_BACK = this.subCreator(Protocol.SEND_BACK(this.channelId), this.channelId);
        this.CONNECT = this.subCreator(Protocol.CONNECT(), this.channelId);
        this.BROADCAST_ALL_BACK = this.subCreator(Protocol.BROADCAST_ALL_BACK(), this.channelId);

        return {
            SEND_BACK: this.SEND_BACK,
            CONNECT: this.CONNECT,
            BROADCAST_ALL_BACK: this.BROADCAST_ALL_BACK,
        }
    };

    private initializePulls(): BackPulls {
        this.LINK = this.pullCreator(Protocol.LINK);
        this.UNLINK = this.pullCreator(Protocol.UNLINK);
        this.ADD_CLIENT_WRITE = this.pullCreator(Protocol.ADD_CLIENT_WRITE);
        this.REMOVE_CLIENT_WRITE = this.pullCreator(Protocol.REMOVE_CLIENT_WRITE);

        return {
            LINK: this.LINK,
            UNLINK: this.UNLINK,
            ADD_CLIENT_WRITE: this.ADD_CLIENT_WRITE,
            REMOVE_CLIENT_WRITE: this.REMOVE_CLIENT_WRITE,
        }
    }
}