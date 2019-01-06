"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MSG_CODES;
(function (MSG_CODES) {
    // FRONT -> BACK
    MSG_CODES[MSG_CODES["CONNECT"] = 0] = "CONNECT";
    MSG_CODES[MSG_CODES["DISCONNECT"] = 1] = "DISCONNECT";
    MSG_CODES[MSG_CODES["SEND_QUEUED"] = 2] = "SEND_QUEUED";
    MSG_CODES[MSG_CODES["SEND_BACK"] = 3] = "SEND_BACK";
    MSG_CODES[MSG_CODES["BROADCAST_ALL_BACK"] = 4] = "BROADCAST_ALL_BACK";
    // BACK -> FRONT
    MSG_CODES[MSG_CODES["CONNECT_SUCCESS"] = 5] = "CONNECT_SUCCESS";
    MSG_CODES[MSG_CODES["CONNECT_FAILED"] = 6] = "CONNECT_FAILED";
    MSG_CODES[MSG_CODES["BROADCAST_MIRROR_FRONTS"] = 7] = "BROADCAST_MIRROR_FRONTS";
    MSG_CODES[MSG_CODES["BROADCAST_ALL_FRONTS"] = 8] = "BROADCAST_ALL_FRONTS";
    MSG_CODES[MSG_CODES["SEND_FRONT"] = 9] = "SEND_FRONT";
    MSG_CODES[MSG_CODES["SET_STATE"] = 10] = "SET_STATE";
    MSG_CODES[MSG_CODES["PATCH_STATE"] = 11] = "PATCH_STATE";
})(MSG_CODES || (MSG_CODES = {}));
;
/**
 * helper class with functions to make sure protocol codes stay synchronized between front and back channels.
 */
class Protocol {
    constructor() { }
    ;
    // FRONT -> BACK
    static CONNECT() { return Protocol.make(MSG_CODES.CONNECT); }
    ;
    static BROADCAST_ALL_BACK() { return Protocol.make(MSG_CODES.BROADCAST_ALL_BACK); }
    ;
    static DISCONNECT(backChannelId) { return Protocol.make(MSG_CODES.DISCONNECT, backChannelId); }
    ;
    static SEND_BACK(backChannelId) { return Protocol.make(MSG_CODES.SEND_BACK, backChannelId); }
    ;
    static SEND_QUEUED(frontUid) { return Protocol.make(MSG_CODES.SEND_QUEUED, frontUid); }
    ;
    // BACK -> FRONT
    static CONNECT_SUCCESS(frontUid) { return Protocol.make(MSG_CODES.CONNECT_SUCCESS, frontUid); }
    ;
    static CONNECT_FAILED(frontUid) { return Protocol.make(MSG_CODES.CONNECT_FAILED, frontUid); }
    ;
    static SEND_FRONT(frontUid) { return Protocol.make(MSG_CODES.SEND_FRONT, frontUid); }
    ;
    static BROADCAST_MIRROR_FRONTS(frontChannelId) { return Protocol.make(MSG_CODES.BROADCAST_MIRROR_FRONTS, frontChannelId); }
    ;
    static SET_STATE(frontChannelId) { return Protocol.make(MSG_CODES.SET_STATE, frontChannelId); }
    ;
    static PATCH_STATE(frontChannelId) { return Protocol.make(MSG_CODES.PATCH_STATE, frontChannelId); }
    ;
    static BROADCAST_ALL_FRONTS() { return Protocol.make(MSG_CODES.BROADCAST_ALL_FRONTS); }
    ;
    /**
     * returns concatenated protocol code if id is provided
     * @param code - unique code for different pub/sub types
     * @param id - if pub/sub message is unique between channels it needs an id so messages dont get leaked to other channels that don't need them.
     * @returns {string}
     */
    static make(code, id) {
        return id ? `${code.toString()}-${id}` : code.toString();
    }
}
exports.default = Protocol;
