/**
 * Cluster will be the class with api to manage all the channels that communicate together.
 * right now it's just my createChannels test helper refactored a bit but this will eventually
 * become the beef of the project when it comes to loading channels onto new processes/machines
 */
import FrontChannel from './FrontChannel';
import BackChannel from './BackChannel';
import { Centrum } from '../../lib/Centrum.js';
export interface ClusterOptions {
    frontServers: number;
    backServers: number;
    totalChannels: number;
    startingBackPort: number;
    startingFrontPort: number;
    host: string;
}
export declare class ChannelCluster {
    readonly options: ClusterOptions;
    private frontServers;
    private backServers;
    private frontChannels;
    private backChannels;
    constructor(options: ClusterOptions);
    closeAll(): void;
    connectAll(): Promise<boolean>;
    createChannels(): {
        frontServers: Centrum[];
        backServers: Centrum[];
        frontChannels: FrontChannel[];
        backChannels: BackChannel[];
        channelsById: {};
    };
}
