import { FrontChannel } from '../FrontChannel';
import { StateData } from '../types';
import { ClientState } from './ClientState';


export class Client {
    readonly uid: string;
    private linkedBackState: any;
    private connectedChannel: FrontChannel;
    private state: ClientState;

    constructor(uid) {
        this.uid = uid;
        this.connectedChannel = null;
        this.linkedBackState = {};
        this.state = new ClientState();
    }

    /**
     * Sets connected channel of client also links it.
     * if the client is already connected then we need
     * to remove it from the state so its not sending
     * to the wrong backserver.
     * @param channel
     */
    public connectChannel(channel: FrontChannel) {
        if(this.connectedChannel) {
            this.connectedChannel.removeState(this.uid);
        }
        this.linkChannel(channel);
        this.connectedChannel = channel;
        this.connectedChannel.updateState(this.state.data, this.uid);
    }

    /**
     * Updates the client's state and also updates
     * it inside the client's connectedChannel to relay
     * to the backChannel.
     * @param newState
     */
    public setState(newState: StateData) {
        this.state.data = newState;
        this.connectedChannel.updateState(newState, this.uid);
    }

    /**
     * adds linkage to a front channel's BackChannel sibling state.
     * @param channel
     */
    public linkChannel(channel: FrontChannel) {
        this.linkedBackState[channel.id] = channel.backState;
    }

    /**
     * unlinks back channel updates for specific channel.
     * @param channelId
     */
    public unlinkChannel(channelId: string) {
        delete this.linkedBackState[channelId];
    }

    /**
     * Returns all the linked channel states the client needs
     * @returns {any}
     */
    public getLinkedStates() {
        return this.linkedBackState
    }

    public getState() {
        return this.state.data;
    }
}