export declare enum STATE_UPDATE_TYPES {
    SET = 0,
    PATCH = 1
}
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
    frontMasterIndex: number;
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
