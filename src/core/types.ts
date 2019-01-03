export interface State { data: StateData }
export type StateData = { [key: string]: StateDatum }
export type StateDatum = Object | number | string;

export interface FrontConnectMessage {
    channelId: string,
    frontUid: string,
    frontServerIndex: number
};

export interface BackToFrontMessage {
    message: any,
    channelId: string,
}

export interface FrontToBackMessage {
    message: any,
    frontUid: string,
}

export enum MSG_CODES {
    // FRONT -> BACK
    CONNECT,
    DISCONNECT,
    SEND_QUEUED,
    SEND_BACK,
    BROADCAST_ALL_BACK,

    // BACK -> FRONT
    CONNECT_SUCCESS,
    CONNECT_FAILED,
    BROADCAST_MIRROR_FRONTS,
    BROADCAST_ALL_FRONTS,
    SEND_FRONT,
    SET_STATE,
    PATCH_STATE,
};
