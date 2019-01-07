"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var SERIALIZER_TYPES;
(function (SERIALIZER_TYPES) {
    SERIALIZER_TYPES["JSON"] = "JSON";
    SERIALIZER_TYPES["MSGPACK"] = "MSGPACK";
    SERIALIZER_TYPES["NONE"] = "NONE";
})(SERIALIZER_TYPES = exports.SERIALIZER_TYPES || (exports.SERIALIZER_TYPES = {}));
exports.defaults = {
    encode: JSON.stringify,
    decode: JSON.parse,
};
function get(type) {
    switch (type) {
        case SERIALIZER_TYPES.JSON: {
            return {
                encode: JSON.stringify,
                decode: JSON.parse,
            };
        }
        case SERIALIZER_TYPES.MSGPACK: {
            return {
                encode: require('notepack.io').encode,
                decode: require('notepack.io').decode,
            };
        }
        case SERIALIZER_TYPES.NONE: {
            return {
                encode: null,
                decode: null,
            };
        }
    }
}
exports.get = get;
