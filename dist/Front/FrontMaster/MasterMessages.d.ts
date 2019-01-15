import { PushProtocol, PullProtocol, MasterMessageFactory } from '../../Channel/MessageFactory';
export interface FrontMasterPulls {
    PATCH_STATE: PullProtocol;
}
export interface FrontMasterPushes {
    SEND_QUEUED: PushProtocol;
}
export declare class MasterMessages extends MasterMessageFactory {
    PATCH_STATE: PullProtocol;
    SEND_QUEUED: PushProtocol;
    push: FrontMasterPushes;
    pull: FrontMasterPulls;
    constructor(messenger: any);
    private initializePulls;
    private initializePushes;
}
