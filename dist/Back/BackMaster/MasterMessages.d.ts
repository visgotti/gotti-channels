import { PushProtocol, PullProtocol, MasterMessageFactory } from '../../Channel/MessageFactory';
export interface BackMasterPushes {
    PATCH_STATE: PushProtocol;
}
export interface BackMasterPulls {
    SEND_QUEUED: PullProtocol;
}
export declare class MasterMessages extends MasterMessageFactory {
    PATCH_STATE: PushProtocol;
    SEND_QUEUED: PullProtocol;
    push: BackMasterPushes;
    pull: BackMasterPulls;
    readonly channelId: string;
    constructor(messenger: any);
    private initializePushes;
    private initializePulls;
}
