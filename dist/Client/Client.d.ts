import { FrontChannel } from '../FrontChannel';
import { StateData, StateLookup } from '../types';
export declare class Client {
    readonly uid: string;
    private linkedBackState;
    private connectedChannel;
    private state;
    constructor(uid: any);
    /**
     * Sets connected channel of client also links it.
     * @param channel
     */
    connectChannel(channel: FrontChannel): void;
    /**
     * Updates the client's state and also updates
     * it inside the client's connectedChannel to relay
     * to the backChannel.
     * @param newState
     */
    setState(newState: StateData): void;
    /**
     * adds linkage to a front channel's BackChannel sibling state.
     * @param channel
     */
    linkChannel(channel: FrontChannel): void;
    /**
     * unlinks back channel updates for specific channel.
     * @param channelId
     */
    unlinkChannelState(channelId: string): void;
    /**
     * Returns all the linked channel states the client needs
     * @returns {StateLookup}
     */
    getLinkedStates(): StateLookup;
    getState(): StateData;
}
