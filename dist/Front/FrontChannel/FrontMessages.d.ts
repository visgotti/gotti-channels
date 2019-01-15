import { PublishProtocol, SubscribeProtocol, PushProtocol, ChannelMessageFactory } from '../../Channel/MessageFactory';
import FrontChannel from './FrontChannel';
export interface FrontPubs {
    CONNECT: PublishProtocol;
    BROADCAST_ALL_BACK: PublishProtocol;
    LINK: PublishProtocol;
    UNLINK: PublishProtocol;
}
export interface FrontSubs {
    CONNECTION_CHANGE: SubscribeProtocol;
    SEND_FRONT: SubscribeProtocol;
    BROADCAST_LINKED_FRONTS: SubscribeProtocol;
    BROADCAST_ALL_FRONTS: SubscribeProtocol;
    ACCEPT_LINK: SubscribeProtocol;
}
export interface FrontPushes {
    SEND_BACK: PushProtocol;
}
export declare class FrontMessages extends ChannelMessageFactory {
    CONNECT: PublishProtocol;
    BROADCAST_ALL_BACK: PublishProtocol;
    LINK: PublishProtocol;
    UNLINK: PublishProtocol;
    SEND_BACK: PushProtocol;
    CONNECTION_CHANGE: SubscribeProtocol;
    BROADCAST_LINKED_FRONTS: SubscribeProtocol;
    BROADCAST_ALL_FRONTS: SubscribeProtocol;
    SEND_FRONT: SubscribeProtocol;
    ACCEPT_LINK: SubscribeProtocol;
    push: FrontPushes;
    pub: FrontPubs;
    sub: FrontSubs;
    readonly frontUid: string;
    readonly channelId: string;
    constructor(messenger: any, channel: FrontChannel);
    private initializePubs;
    private initializePushes;
    private initializeSubs;
}
