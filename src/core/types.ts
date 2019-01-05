export interface State { data: StateData }
export type StateData = { [key: string]: StateDatum }
export type StateDatum = Object | number | string;

export interface FrontConnectMessage {
    channelId: string,
    frontUid: string,
    frontServerIndex: number
}

export interface BackToFrontMessage {
    message: any,
    channelId: string,
}

export interface FrontToBackMessage {
    message: any,
    frontUid: string,
}

export type FrontUid = string;
export type FrontServerIndex = number;
export type ChannelId = string;

export type FrontServerLookup = Map<FrontUid, FrontServerIndex>;

export type ChannelHandlers = Map <ChannelId, ChannelHandlerMap>
export type SubscriptionHandlerIds = Map <string, number>

export interface ChannelHandlerMap {
    send: Function,
    disconnect?: Function,
}

