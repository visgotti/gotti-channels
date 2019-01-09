"use strict";
/**
 * Cluster will be the class with api to manage all the channels that communicate together.
 * right now it's just my createChannels test helper refactored a bit but this will eventually
 * become the beef of the project when it comes to loading channels onto new processes/machines
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const FrontChannel_1 = require("./core/FrontChannel");
const BackChannel_1 = require("./core/BackChannel");
const Messenger_js_1 = require("../lib/core/Messenger.js");
class ChannelCluster {
    constructor(options) {
        this.options = options;
        this.frontServers = [];
        this.backServers = [];
        this.frontChannels = [];
        this.backChannels = [];
    }
    ;
    closeAll() {
        for (let i = 0; i < this.frontChannels.length; i++) {
            this.frontChannels[i].close();
        }
        for (let j = 0; j < this.backChannels.length; j++) {
            this.backChannels[j].close();
        }
    }
    connectAll() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let awaitingConnections = this.options.totalChannels * this.options.frontServers;
                for (let i = 0; i < this.frontChannels.length; i++) {
                    const connected = yield this.frontChannels[i].connect();
                    if (connected) {
                        awaitingConnections--;
                        if (awaitingConnections === 0) {
                            return true;
                        }
                    }
                    else {
                        throw new Error('Error connecting.');
                    }
                }
            }
            catch (err) {
                throw err;
            }
        });
    }
    //TODO: figure out correct way to make this asynchronous.
    createChannels() {
        const { frontServers, backServers, totalChannels, startingBackPort, startingFrontPort, host } = this.options;
        const backServerPubUris = [];
        const frontServerPubUris = [];
        for (let i = 0; i < backServers; i++) {
            backServerPubUris.push(host + (startingBackPort + i));
        }
        for (let i = 0; i < frontServers; i++) {
            frontServerPubUris.push(host + (startingFrontPort + i));
        }
        for (let i = 0; i < backServers; i++) {
            const backServerOptions = {
                id: `backServer${i}`,
                publish: {
                    pubSocketURI: backServerPubUris[i],
                },
                subscribe: {
                    pubSocketURIs: frontServerPubUris
                }
            };
            this.backServers.push(new Messenger_js_1.Messenger(backServerOptions));
        }
        for (let i = 0; i < frontServers; i++) {
            const frontServerOptions = {
                id: `frontServer${i}`,
                publish: {
                    pubSocketURI: frontServerPubUris[i],
                },
                subscribe: {
                    pubSocketURIs: backServerPubUris
                }
            };
            this.frontServers.push(new Messenger_js_1.Messenger(frontServerOptions));
        }
        const backChannelsPerServer = totalChannels / backServers;
        const frontChannelsPerServer = totalChannels;
        for (let i = 0; i < frontServers; i++) {
            for (let j = 0; j < frontChannelsPerServer; j++) {
                this.frontChannels.push(new FrontChannel_1.default(j, i, totalChannels, this.frontServers[i]));
            }
        }
        let j = 0;
        let serverIndex = 0;
        for (let i = 0; i < totalChannels; i++) {
            this.backChannels.push(new BackChannel_1.default(i, this.backServers[serverIndex]));
            j++;
            if (j > backChannelsPerServer - 1) {
                j = 0;
                serverIndex++;
            }
        }
        let channelsById = {};
        for (let i = 0; i < this.frontChannels.length; i++) {
            const frontChannel = this.frontChannels[i];
            if (!(channelsById[frontChannel.channelId])) {
                channelsById[frontChannel.channelId] = { "fronts": [], "back": null, channelId: frontChannel.channelId };
            }
            channelsById[frontChannel.channelId].fronts.push(this.frontChannels[i]);
        }
        for (let i = 0; i < this.backChannels.length; i++) {
            const backChannel = this.backChannels[i];
            if (!(channelsById[backChannel.channelId])) {
                throw "Channel Id should exist.";
            }
            channelsById[backChannel.channelId].back = backChannel;
        }
        return {
            frontServers: this.frontServers,
            backServers: this.backServers,
            frontChannels: this.frontChannels,
            backChannels: this.backChannels,
            channelsById,
        };
    }
}
exports.ChannelCluster = ChannelCluster;
