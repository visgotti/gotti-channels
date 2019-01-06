import { Channel } from './Channel/Channel';
import { Centrum } from '../../lib/Centrum';
import { StateData } from './types';
export declare class BackChannel extends Channel {
    broadcastState: Function;
    broadcastPatch: Function;
    private _sendMessage;
    private connectedFrontChannels;
    readonly connectedFrontChannelIds: Set<string>;
    private _previousStateEncoded;
    constructor(id: any, centrum: Centrum);
    onMessage(handler: (message: any, fromFrontId?: string) => void): void;
    onSetState(stateData: StateData): void;
    onPatchState(any: any): void;
    /**
     * Sends message to either all sibling front channels
     * or a specified one if provided a valid frontId
     * @param message
     */
    sendMessage(message: any, frontChannelId?: string): void;
    /**
     * returns all the keys in the connectedFrontChannels map
     */
    getConnectedFrontIds(): Array<string>;
    /**
     * called on subscriptions, use onMessage to register message handler.
     * @param message - data
     * @param fromFrontId - if we receive a message thats not from a sibling front channel
     * this field will contain data
     */
    private onMessageHandler;
    setState(stateData: StateData): void;
    private _onStateSet;
    private _onMessage;
    private addFrontChannelConnection;
    private removeFrontChannelConnection;
    private broadcastPatchHandler;
    private broadcastStateHandler;
    private initializeCentrumSubscriptions;
    private initializeCentrumPublications;
}
