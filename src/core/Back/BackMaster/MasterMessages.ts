import { Protocol, PushProtocol, PullProtocol, MasterMessageFactory } from '../../Channel/MessageFactory'

export interface BackMasterPushes {
    PATCH_STATE: PushProtocol,
}

export interface BackMasterPulls {
    SEND_QUEUED: PullProtocol
}

export class MasterMessages extends MasterMessageFactory {
    public PATCH_STATE:  PushProtocol;

    public SEND_QUEUED: PullProtocol;

    public push: BackMasterPushes;
    public pull: BackMasterPulls;

    readonly channelId: string;

    constructor(messenger) {
        super(messenger);
        this.push = this.initializePushes();
        this.pull = this.initializePulls();
    }
    private initializePushes() : BackMasterPushes {
        this.PATCH_STATE = this.pushCreator(Protocol.PATCH_STATE, 'NONE'); // encoding for states happen in the back channel patchState function

        return {
            PATCH_STATE: this.PATCH_STATE,
        }
    }

    private initializePulls(): BackMasterPulls {
        this.SEND_QUEUED = this.pullCreator(Protocol.SEND_QUEUED);

        return {
            SEND_QUEUED: this.SEND_QUEUED,
        }
    }
}