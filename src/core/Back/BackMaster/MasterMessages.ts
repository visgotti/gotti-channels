import { Protocol, PushProtocol, PullProtocol, MasterMessageFactory } from '../Channel/MessageFactory'
import { MasterChannel } from './MasterChannel';

export interface BackMasterPushes {
    PATCH_STATE: PushProtocol,
}

export interface BackMasterPulls {
    SEND_QUEUED: PullProtocol
}

export class BackMessages extends MasterMessageFactory {
    public PATCH_STATE:  PushProtocol;

    public SEND_QUEUED: PullProtocol;

    public push: BackMasterPushes;
    public pull: BackMasterPulls;

    readonly channelId: string;

    constructor(messenger, channel: MasterChannel) {
        super(messenger, channel);
        this.messenger = messenger;
        this.channelId = channel.channelId;
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