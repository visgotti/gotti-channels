import { PublishProtocol, SubscribeProtocol, PushProtocol, PullProtocol, ChannelMessageFactory } from '../../Channel/MessageFactory';
import BackChannel from './BackChannel';
export interface BackPubs {
    BROADCAST_ALL_FRONTS: PublishProtocol;
}
export interface BackPushes {
    CONNECTION_CHANGE: PushProtocol;
    SEND_FRONT: PushProtocol;
    BROADCAST_LINKED_FRONTS: PushProtocol;
    ACCEPT_LINK: PushProtocol;
}
export interface BackSubs {
    SEND_BACK: SubscribeProtocol;
    CONNECT: SubscribeProtocol;
    BROADCAST_ALL_BACK: SubscribeProtocol;
}
export interface BackPulls {
    LINK: PullProtocol;
    UNLINK: PullProtocol;
}
export declare class BackMessages extends ChannelMessageFactory {
    CONNECT: SubscribeProtocol;
    BROADCAST_ALL_BACK: SubscribeProtocol;
    SEND_BACK: SubscribeProtocol;
    LINK: PullProtocol;
    UNLINK: PullProtocol;
    SEND_FRONT: PushProtocol;
    CONNECTION_CHANGE: PushProtocol;
    BROADCAST_LINKED_FRONTS: PublishProtocol;
    BROADCAST_ALL_FRONTS: PublishProtocol;
    ACCEPT_LINK: PublishProtocol;
    push: BackPushes;
    pub: BackPubs;
    sub: BackSubs;
    pull: BackPulls;
    readonly channelId: string;
    constructor(messenger: any, channel: BackChannel);
    private initializePubs;
    private initializePushes;
    private initializeSubs;
    private initializePulls;
}
