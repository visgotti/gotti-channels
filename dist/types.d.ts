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
export declare type FrontUid = string;
export declare type FrontServerIndex = number;
export declare type ChannelId = string;
export declare type FrontServerLookup = Map<FrontUid, FrontServerIndex>;
export declare type ChannelHandlers = Map<ChannelId, ChannelHandlerMap>;
export interface ChannelHandlerMap {
    send: Function;
    disconnect?: Function;
}
