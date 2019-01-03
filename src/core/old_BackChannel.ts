import { PROTOCOL } from './protocol';

type ConnectedFrontChannel = {
    send: Function
}

import { Channel, ChannelType } from './Channel/Channel';

import { Centrum } from '../../lib/Centrum';

import { StateData } from './types';

export class BackChannel extends Channel {

    public broadcastState: Function;
    public broadcastPatch: Function;
    private _sendMessage: Function;

    private connectedFrontChannels: Map<string, ConnectedFrontChannel>;
    readonly connectedFrontChannelIds: Set<string>;

    private _previousStateEncoded: any;

    constructor(id, centrum: Centrum) {
        super(id, centrum);
        this.connectedFrontChannels = new Map();

        this.initializeCentrumPublications();
        this.initializeCentrumSubscriptions();
    }

    public onMessage(handler: (message: any, fromFrontId?: string) => void) {
        this.onMessageHandler = handler;
    };

    public onSetState(stateData: StateData) : void {};
    public onPatchState(any: any) : void {};

    /**
     * Sends message to either all sibling front channels
     * or a specified one if provided a valid frontId
     * @param message
     */
    public sendMessage(message: any, frontChannelId?: string) : void {
        if(frontChannelId) {
            if(!(this.connectedFrontChannels.has(frontChannelId)))
                throw new Error(`Invalid frontChannelId:${frontChannelId} was not connected to backChannel: ${this.id}`);

            this.connectedFrontChannels.get(frontChannelId).send(message);
        } else {
            this._sendMessage(message);
        }
    };


    /**
     * returns all the keys in the connectedFrontChannels map
     */
    public getConnectedFrontIds() : Array<string> {
        return Array.from(this.connectedFrontChannels.keys());
    }


    /**
     * called on subscriptions, use onMessage to register message handler.
     * @param message - data
     * @param fromFrontId - if we receive a message thats not from a sibling front channel
     * this field will contain data
     */
    private onMessageHandler(message: any, fromFrontId?: string) : void {
        throw new Error(`Unimplimented message handler in back channel ${this.id}`);
    }

    public setState(stateData: StateData) : void {
        this._setState(stateData);
        this._onStateSet(stateData);
    }

    private _onStateSet(stateData: StateData) : void {
        this.onSetState(stateData);
    }

    private _onMessage(message: any, from?: string) : void {
        this.onMessageHandler(message, from);
    }

    private addFrontChannelConnection(frontId: string) : void {
        //todo maybe send a confirmation connect message for async or even an onFrontConnect hook.
        const name = `${PROTOCOLS.BACK_SEND}-${frontId}`;

        // channels share centrum instance so dont want to duplicate publish.
        if(!(this.centrum.publish[name])) {
            this.centrum.createPublish(name);
        }
        this.connectedFrontChannels.set(frontId, {
            send: this.centrum.publish[name]
        });
    }

    private removeFrontChannelConnection(frontId: string) : void {
        this.connectedFrontChannels.delete(frontId);
        this.centrum.removePublish(`${PROTOCOL.BACK_SEND}-${frontId}`);
    }

    private broadcastPatchHandler() : void {
    }
    private broadcastStateHandler() : StateData {
        return this.state.data;
    }

    // back channels subscription can receive data that includes removed front states,
    // first we use this to remove states from the back before continuing to
    // process the updated front state.

    private initializeCentrumSubscriptions() : void {
        // sends connect message to sibiling back channel.
        this.centrum.createSubscription(PROTOCOL.CONNECT, (frontId) => {
            this.addFrontChannelConnection(frontId);
        });

        // sends disconnect message to sibiling back channel.
        const disconnectMessageName =  `${this.id}-${PROTOCOL.DISCONNECT}`;
        this.centrum.createSubscription(disconnectMessageName, (frontId) => {
            this.removeFrontChannelConnection(frontId);
        });

        const forwardQueuedMessagesPubName = `${this.id}-${PROTOCOL.FORWARD_QUEUED}`;
        this.centrum.createSubscription(forwardQueuedMessagesPubName, (data: any) => {
            for(let i = 0; i < data.length; i++) {
                this._onMessage(data[i]);
            }
        });

        // if front server wants to send message to all back channels
        // adds this subscription handler to every back channel.
        this.centrum.createSubscription(PROTOCOL.FRONT_TO_ALL_BACK, (data: any) => {
            this._onMessage(data.message, data.from);
        });
    };

    private initializeCentrumPublications() : void {
        // front channels subscribe to back channel for JUST state data updates not removals since
        // the backState in a front channel just blindly takes shape each update from the sibling BackChannel
        const patchStatePubName = `${PROTOCOL.PATCH_STATE}-${this.id}`;
        this.centrum.createPublish(patchStatePubName, this.broadcastStateHandler.bind(this));
        this.broadcastState = this.centrum.publish[patchStatePubName].bind(this);

        const setStatePubName = `${PROTOCOL.SET_STATE}-${this.id}`;
        this.centrum.createPublish(setStatePubName, this.broadcastPatchHandler.bind(this));
        this.broadcastPatch = this.centrum.publish[setStatePubName].bind(this);

        // sends a message to all sibling front channels.
        const sendMessagePubName = `${PROTOCOL.BACK_SEND}-${this.id}`;
        this.centrum.createPublish(sendMessagePubName);
        this._sendMessage = this.centrum.publish[sendMessagePubName];
    };
}