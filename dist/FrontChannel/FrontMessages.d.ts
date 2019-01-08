import { PublishProtocol, SubscribeProtocol, PushProtocol, MessageFactory } from '../Channel/MessageFactory';
import FrontChannel from './FrontChannel';
export interface FrontPubs {
    CONNECT: PublishProtocol;
    DISCONNECT: PublishProtocol;
    SEND_QUEUED: PublishProtocol;
    BROADCAST_ALL_BACK: PublishProtocol;
}
export interface FrontSubs {
    CONNECTION_CHANGE: SubscribeProtocol;
    SEND_FRONT: SubscribeProtocol;
    BROADCAST_LINKED_FRONTS: SubscribeProtocol;
    BROADCAST_ALL_FRONTS: SubscribeProtocol;
}
export interface FrontPushes {
    SEND_BACK: PushProtocol;
}
export interface FrontPulls {
}
export declare class FrontMessages extends MessageFactory {
    SEND_QUEUED: PublishProtocol;
    CONNECT: PublishProtocol;
    BROADCAST_ALL_BACK: PublishProtocol;
    DISCONNECT: PublishProtocol;
    SEND_BACK: PushProtocol;
    CONNECTION_CHANGE: SubscribeProtocol;
    BROADCAST_LINKED_FRONTS: SubscribeProtocol;
    BROADCAST_ALL_FRONTS: SubscribeProtocol;
    SET_STATE: SubscribeProtocol;
    PATCH_STATE: SubscribeProtocol;
    SEND_FRONT: SubscribeProtocol;
    push: FrontPushes;
    pub: FrontPubs;
    sub: FrontSubs;
    readonly frontUid: string;
    readonly channelId: string;
    constructor(centrum: any, channel: FrontChannel);
    private initializePubs;
    private initializePushes;
    private initializeSubs;
}
