export interface State {
    data: StateData;
}
export declare type StateData = {
    [key: string]: StateDatum;
};
export declare type StateDatum = Object | number | string;
export interface FrontConnectMessage {
    channelId: string;
    frontUid: string;
    frontServerIndex: number;
}
export interface BackToFrontMessage {
    message: any;
    channelId: string;
}
export interface FrontToBackMessage {
    message: any;
    frontUid: string;
}
export interface ConnectedFrontData {
    frontUid: string;
    channelId: string;
    serverIndex: number;
    clientUids?: Set<string>;
}
export interface ConnectedClientData {
    clientUid: string;
    frontUid: string;
    frontServerIndex: number;
}
export declare enum CONNECTION_STATUS {
    DISCONNECTED = "DISCONNECTED",
    DISCONNECTING = "DISCONNECTING",
    CONNECTING = "CONNECTING",
    CONNECTED = "CONNECTED"
}
export declare enum CONNECTION_CHANGE {
    CONNECTED = "CONNECTED",
    DISCONNECTED
}
export declare type FrontUid = string;
export declare type FrontServerIndex = number;
export declare type ChannelId = string;
export declare type FrontServerLookup = Map<FrontUid, FrontServerIndex>;
export declare type ChannelHandlers = Map<ChannelId, ChannelHandlerMap>;
export declare type SubscriptionHandlerIds = Map<string, number>;
export interface ChannelHandlerMap {
    send: Function;
    disconnect?: Function;
}
