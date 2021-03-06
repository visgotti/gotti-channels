import { Protocol, PushProtocol, PullProtocol, MasterMessageFactory } from '../../Channel/MessageFactory'
import * as msgpack from 'notepack.io';

export interface BackMasterPushes {
    PATCH_STATE: PushProtocol,
    MESSAGE_CLIENT: PushProtocol,
}

export interface BackMasterPulls {
    SEND_QUEUED: PullProtocol
}

export class MasterMessages extends MasterMessageFactory {
    public PATCH_STATE:  PushProtocol;
    public MESSAGE_CLIENT: PushProtocol;

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
        this.PATCH_STATE = this.pushCreator(Protocol.PATCH_STATE, false); // encoding for states happen in the back channel patchState function
        this.MESSAGE_CLIENT = this.pushCreator(Protocol.MESSAGE_CLIENT, msgpack.encode);

        return {
            PATCH_STATE: this.PATCH_STATE,
            MESSAGE_CLIENT: this.MESSAGE_CLIENT,
        }
    }

    private initializePulls(): BackMasterPulls {
        this.SEND_QUEUED = this.pullCreator(Protocol.SEND_QUEUED);

        return {
            SEND_QUEUED: this.SEND_QUEUED,
        }
    }
}