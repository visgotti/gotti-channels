import { Protocol, PublishProtocol, SubscribeProtocol, ChannelMessages } from '../Channel/Messages'
import { BackToFrontMessage } from '../types';
import { FrontChannel } from './FrontChannel';

type onMessageCallback = (message: any, channelId: string) => void;
type onConnectedCallback = (channelId: string) => void;

export class FrontMessages extends ChannelMessages {
    public SEND_QUEUED: PublishProtocol;
    public CONNECT: PublishProtocol;
    public BROADCAST_ALL_BACK: PublishProtocol;
    public SEND_BACK: PublishProtocol;
    public DISCONNECT: PublishProtocol;

    public SEND_FRONT: SubscribeProtocol;
    public CONNECT_SUCCESS: SubscribeProtocol;
    public CONNECT_FAILED: SubscribeProtocol;
    public BROADCAST_MIRROR_FRONTS: SubscribeProtocol;
    public BROADCAST_ALL_FRONTS: SubscribeProtocol;
    public SET_STATE:  SubscribeProtocol;
    public PATCH_STATE: SubscribeProtocol;

    readonly frontUid: string;
    readonly channelId: string;

    constructor(centrum, channel: FrontChannel) {
        super(centrum, channel);
        this.centrum = centrum;
        this.frontUid = channel.frontUid;
        this.channelId = channel.channelId;
        this.initializePublishProtocols();
        this.initializeSubscribeProtocols();
    }

    private initializePublishProtocols() {
        this.CONNECT = this.pubCreator(Protocol.CONNECT());
        this.SEND_QUEUED = this.pubCreator(Protocol.SEND_QUEUED(this.frontUid));
        this.BROADCAST_ALL_BACK = this.pubCreator(Protocol.BROADCAST_ALL_BACK());
        this.SEND_BACK = this.multiPubCreator(Protocol.SEND_BACK);
        this.DISCONNECT = {};
    }

    private initializeSubscribeProtocols() {
        this.CONNECT_SUCCESS = this.subCreator(Protocol.CONNECT_SUCCESS(this.frontUid), this.frontUid);
        this.SEND_FRONT = this.subCreator(Protocol.SEND_FRONT(this.frontUid), this.frontUid);
    }

}