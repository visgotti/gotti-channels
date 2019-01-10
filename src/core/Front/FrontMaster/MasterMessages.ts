import { Protocol, PushProtocol, PullProtocol, MasterMessageFactory } from '../Channel/MessageFactory'
import { MasterChannel } from './MasterChannel';

export interface FrontMasterPulls {
    PATCH_STATE: PullProtocol,
}

export interface FrontMasterPushes {
    SEND_QUEUED: PushProtocol
}

export class FrontMessages extends MasterMessageFactory {
    public PATCH_STATE:  PullProtocol;

    public SEND_QUEUED: PushProtocol;

    public push: FrontMasterPushes;
    public pull: FrontMasterPulls;

    readonly channelId: string;

    constructor(messenger, channel: MasterChannel) {
        super(messenger, channel);
        this.messenger = messenger;

        this.channelId = channel.channelId;
        this.push = this.initializePushes();
        this.pull = this.initializePulls();
    }
    private initializePulls() : FrontMasterPushes {
        this.PATCH_STATE = this.pullCreator(Protocol.PATCH_STATE, 'NONE');

        return {
            PATCH_STATE: this.PATCH_STATE,
        }
    }

    private initializePushes(): FrontMasterPulls {
        this.SEND_QUEUED = this.pushCreator(Protocol.SEND_QUEUED);

        return {
            SEND_QUEUED: this.SEND_QUEUED,
        }
    }
}