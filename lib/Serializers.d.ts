export declare enum SERIALIZER_TYPES {
    JSON = "JSON",
    MSGPACK = "MSGPACK",
    NONE = "NONE"
}
interface Serializer {
    encode: Function;
    decode: Function;
}
export declare const defaults: {
    encode: {
        (value: any, replacer?: (key: string, value: any) => any, space?: string | number): string;
        (value: any, replacer?: (string | number)[], space?: string | number): string;
    };
    decode: (text: string, reviver?: (key: any, value: any) => any) => any;
};
export declare function get(type: SERIALIZER_TYPES): Serializer;
export {};
