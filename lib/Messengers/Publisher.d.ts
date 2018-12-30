import { Hook, Handler } from '../Centrum';
export declare class Publisher {
    private pubSocket;
    constructor(pubSocket: any);
    make(name: any, beforeHook?: Hook, afterHandler?: Handler): (...args: any[]) => void;
    private makeForData;
    private makeForBeforeHook;
}
