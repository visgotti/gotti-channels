import { PublishProtocol, SubscribeProtocol, PushProtocol, PullProtocol, MessageFactory } from '../Channel/MessageFactory';
import BackChannel from './BackChannel';
export interface BackPubs {
    BROADCAST_ALL_FRONTS: PublishProtocol;
}
export interface BackPushes {
    CONNECTION_CHANGE: PushProtocol;
    SEND_FRONT: PushProtocol;
    BROADCAST_LINKED_FRONTS: PushProtocol;
    SET_STATE: PushProtocol;
    PATCH_STATE: PushProtocol;
}
export interface BackSubs {
    SEND_BACK: SubscribeProtocol;
    CONNECT: SubscribeProtocol;
    BROADCAST_ALL_BACK: SubscribeProtocol;
    DISCONNECT: SubscribeProtocol;
}
export interface BackPulls {
    SEND_QUEUED: PullProtocol;
    LINK: PullProtocol;
    UNLINK: PullProtocol;
}
export declare class BackMessages extends MessageFactory {
    CONNECT: SubscribeProtocol;
    BROADCAST_ALL_BACK: SubscribeProtocol;
    DISCONNECT: SubscribeProtocol;
    SEND_BACK: SubscribeProtocol;
    SEND_QUEUED: PullProtocol;
    LINK: PullProtocol;
    UNLINK: PullProtocol;
    SEND_FRONT: PushProtocol;
    CONNECTION_CHANGE: PushProtocol;
    BROADCAST_LINKED_FRONTS: PublishProtocol;
    BROADCAST_ALL_FRONTS: PublishProtocol;
    SET_STATE: PublishProtocol;
    PATCH_STATE: PublishProtocol;
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
