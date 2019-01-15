export enum STATE_UPDATE_TYPES {
    SET = 0,
    PATCH = 1
}

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

export interface ConnectedFrontData {
    frontUid: string,
    channelId: string,
    frontMasterIndex: number,
    clientUids?: Set<string>,
}

export interface ConnectedClientData {
    clientUid: string,
    frontUid: string,
    frontServerIndex: number,
}

export enum CONNECTION_STATUS {
    DISCONNECTED = 'DISCONNECTED',
    DISCONNECTING = 'DISCONNECTING',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
}

export enum CONNECTION_CHANGE {
    CONNECTED = CONNECTION_STATUS.CONNECTED,
    DISCONNECTED = CONNECTION_CHANGE.DISCONNECTED,
}

interface ClusterConfig {
    back_server_uris: Array<string>,
    front_server_uris: Array<string>,
    channels_per_back: number,
    patch_rate: number,
    relay_rate: number,
}