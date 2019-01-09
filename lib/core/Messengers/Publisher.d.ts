import { Hook } from '../Messenger';
export declare class Publisher {
    private pubSocket;
    constructor(pubSocket: any);
    make(name: any, encode?: Function, beforeHook?: Hook): (...args: any[]) => void;
    private makeForData;
    private makeForBeforeHook;
}
