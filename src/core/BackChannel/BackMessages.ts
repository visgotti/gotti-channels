import { Protocol, PublishProtocol, SubscribeProtocol, ChannelMessages } from '../Channel/Messages'
import { FrontToBackMessage } from '../types';
import { BackChannel } from './BackChannel';

type onMessageCallback = (message: any, channelId: string) => void;
type onConnectedCallback = (channelId: string) => void;

export class BackMessages extends ChannelMessages {
    public SEND_QUEUED: SubscribeProtocol;
    public CONNECT: SubscribeProtocol;
    public BROADCAST_ALL_BACK: SubscribeProtocol;
    public SEND_BACK: SubscribeProtocol;
    public DISCONNECT: SubscribeProtocol;

    public SEND_FRONT: PublishProtocol;
    public CONNECT_SUCCESS: PublishProtocol;
    public CONNECT_FAILED: PublishProtocol;
    public BROADCAST_MIRROR_FRONTS: PublishProtocol;
    public BROADCAST_ALL_FRONTS: PublishProtocol;
    public SET_STATE:  PublishProtocol;
    public PATCH_STATE: PublishProtocol;

    readonly channelId: string;

    constructor(centrum, channel: FrontChannel) {
        super(centrum, channel);
        this.centrum = centrum;
        this.frontUid = channel.frontUid;
        this.channelId = channel.channelId;
        this.initializePublishProtocols();
        this.initializePublishProtocols();
    }

    private initializePublishProtocols() {
        this.CONNECT = this.pubCreator();
        this.SEND_QUEUED = this.pubCreator();
        this.BROADCAST_ALL_BACK = this.pubCreator();
        this.SEND_BACK = this.multiPubCreator();
        this.DISCONNECT = {};
    }

    private initializePublishProtocols() {
        this.CONNECT_SUCCESS = this.subCreator(this.frontUid);
    }
}