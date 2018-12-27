import { Hook } from '../Centrum';
export declare class Publisher {
    private pubSocket;
    constructor(pubSocket: any);
    makeForHook(name: any, beforeHook: Hook): (...args: any[]) => void;
    makeForData(name: any): (data: any) => void;
}
