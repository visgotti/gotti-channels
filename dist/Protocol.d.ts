declare enum MSG_CODES {
    CONNECT = 0,
    DISCONNECT = 1,
    SEND_QUEUED = 2,
    SEND_BACK = 3,
    BROADCAST_ALL_BACK = 4,
    CONNECT_SUCCESS = 5,
    CONNECT_FAILED = 6,
    BROADCAST_LINKED_FRONTS = 7,
    BROADCAST_ALL_FRONTS = 8,
    SEND_FRONT = 9,
    SET_STATE = 10,
    PATCH_STATE = 11
}
/**
 * helper class with functions to make sure protocol codes stay synchronized between front and back channels.
 */
declare class Protocol {
    constructor();
    static CONNECT(): string;
    static BROADCAST_ALL_BACK(): string;
    static DISCONNECT(backChannelId: any): string;
    static SEND_BACK(backChannelId: any): string;
    static SEND_QUEUED(frontUid: any): string;
    static CONNECT_SUCCESS(frontUid: any): string;
    static CONNECT_FAILED(frontUid: any): string;
    static SEND_FRONT(frontUid: any): string;
    static BROADCAST_LINKED_FRONTS(frontChannelId: any): string;
    static SET_STATE(frontChannelId: any): string;
    static PATCH_STATE(frontChannelId: any): string;
    static BROADCAST_ALL_FRONTS(): string;
    /**
     * returns concatenated protocol code if id is provided
     * @param code - unique code for different pub/sub types
     * @param id - if pub/sub message is unique between channels it needs an id so messages dont get leaked to other channels that don't need them.
     * @returns {string}
     */
    static make(code: MSG_CODES, id?: string): string;
}
export default Protocol;
