import { Protocol, PushProtocol, PullProtocol, MasterMessageFactory } from '../../Channel/MessageFactory'

export interface FrontMasterPulls {
    PATCH_STATE: PullProtocol,
}

export interface FrontMasterPushes {
    SEND_QUEUED: PushProtocol
}

export class MasterMessages extends MasterMessageFactory {
    public PATCH_STATE:  PullProtocol;
    public SEND_QUEUED: PushProtocol;

    public push: FrontMasterPushes;
    public pull: FrontMasterPulls;

    constructor(messenger) {
        super(messenger);
        this.messenger = messenger;

        this.push = this.initializePushes();
        this.pull = this.initializePulls();
    }

    private initializePulls() : FrontMasterPulls {
        this.PATCH_STATE = this.pullCreator(Protocol.PATCH_STATE, 'NONE');

        return {
            PATCH_STATE: this.PATCH_STATE,
        }
    }

    private initializePushes(): FrontMasterPushes {
        this.SEND_QUEUED = this.pushCreator(Protocol.SEND_QUEUED);

        return {
            SEND_QUEUED: this.SEND_QUEUED,
        }
    }
}