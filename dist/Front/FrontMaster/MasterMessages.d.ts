import { PushProtocol, SubscribeProtocol, MasterMessageFactory } from '../../Channel/MessageFactory';
export interface FrontMasterSubs {
    PATCH_STATE: SubscribeProtocol;
    MESSAGE_CLIENT: SubscribeProtocol;
}
export interface FrontMasterPushes {
    SEND_QUEUED: PushProtocol;
}
export declare class MasterMessages extends MasterMessageFactory {
    PATCH_STATE: SubscribeProtocol;
    MESSAGE_CLIENT: SubscribeProtocol;
    SEND_QUEUED: PushProtocol;
    push: FrontMasterPushes;
    sub: FrontMasterSubs;
    private frontMasterIndex;
    constructor(messenger: any, frontMasterIndex: number);
    private initializeSubs;
    private initializePushes;
}
