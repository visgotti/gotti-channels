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
