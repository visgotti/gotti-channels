import { Protocol, PushProtocol, SubscribeProtocol, MasterMessageFactory } from '../../Channel/MessageFactory'

export interface FrontMasterSubs {
    PATCH_STATE: SubscribeProtocol,
    MESSAGE_CLIENT: SubscribeProtocol,
}

export interface FrontMasterPushes {
    SEND_QUEUED: PushProtocol
}

export class MasterMessages extends MasterMessageFactory {
    public PATCH_STATE:  SubscribeProtocol;
    public MESSAGE_CLIENT: SubscribeProtocol;

    public SEND_QUEUED: PushProtocol;

    public push: FrontMasterPushes;
    public sub: FrontMasterSubs;

    private frontMasterIndex: number;

    constructor(messenger, frontMasterIndex: number) {
        super(messenger);
        this.messenger = messenger;
        this.frontMasterIndex = frontMasterIndex;

        this.push = this.initializePushes();
        this.sub = this.initializeSubs();
    }

    private initializeSubs(): FrontMasterSubs {
        this.PATCH_STATE = this.subCreator(Protocol.PATCH_STATE(this.frontMasterIndex), this.frontMasterIndex, 'NONE');
        this.MESSAGE_CLIENT = this.subCreator(Protocol.MESSAGE_CLIENT(this.frontMasterIndex), this.frontMasterIndex, 'MSGPACK');

        return {
            PATCH_STATE: this.PATCH_STATE,
            MESSAGE_CLIENT: this.MESSAGE_CLIENT,
        }
    }


    private initializePushes(): FrontMasterPushes {
        this.SEND_QUEUED = this.pushCreator(Protocol.SEND_QUEUED);

        return {
            SEND_QUEUED: this.SEND_QUEUED,
        }
    }
}