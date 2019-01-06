const { Centrum } = require('../lib/Centrum.js');

import { FrontChannel } from '../src/core/FrontChannel/FrontChannel';
import { BackChannel } from '../src/core/BackChannel/BackChannel';


export function createChannels(options) {
    const { FRONT_SERVERS, BACK_SERVERS, TOTAL_CHANNELS, STARTING_BACK_PUB_PORT, STARTING_FRONT_PUB_PORT } = options;

    let frontServers = [];
    let frontChannels = [];

    let backServers = [];
    let backChannels = [];

    const BACK_SERVER_PUB_URIS = [];
    const FRONT_SERVER_PUB_URIS = [];

    for(let i = 0; i < BACK_SERVERS; i++) {
        BACK_SERVER_PUB_URIS.push('tcp://127.0.0.1:'+(STARTING_BACK_PUB_PORT + i));
    }
    for(let i = 0; i < FRONT_SERVERS; i++) {
        FRONT_SERVER_PUB_URIS.push('tcp://127.0.0.1:'+(STARTING_FRONT_PUB_PORT + i));
    }

    for(let i = 0; i < BACK_SERVERS; i++) {
        const backServerOptions = {
            id: `backServer${i}`,
            publish: {
                pubSocketURI: BACK_SERVER_PUB_URIS[i],
            },
            subscribe: {
                pubSocketURIs: FRONT_SERVER_PUB_URIS
            }
        };
        backServers.push(new Centrum(backServerOptions));
    }

    for(let i = 0; i < FRONT_SERVERS; i++) {
        const frontServerOptions = {
            id: `frontServer${i}`,
            publish: {
                pubSocketURI: FRONT_SERVER_PUB_URIS[i],
            },
            subscribe: {
                pubSocketURIs: BACK_SERVER_PUB_URIS
            }
        };
        frontServers.push(new Centrum(frontServerOptions));
    }

    const backChannelsPerServer = TOTAL_CHANNELS / BACK_SERVERS;
    const frontChannelsPerServer = TOTAL_CHANNELS;

    for(let i = 0; i < FRONT_SERVERS; i++) {
        for(let j = 0; j < frontChannelsPerServer; j++) {
            frontChannels.push(new FrontChannel(j, i, TOTAL_CHANNELS, frontServers[i]));
        }
    }

    let j = 0;
    let serverIndex = 0;
    for(let i = 0; i < TOTAL_CHANNELS; i++) {
        backChannels.push(new BackChannel(i, backServers[serverIndex]));
        j++;
        if(j > backChannelsPerServer - 1) {
            j = 0;
            serverIndex++;
        }
    }

    let channelsById = {};

    for(let i = 0; i < frontChannels.length; i++) {
        const frontChannel = frontChannels[i];
        if(!(channelsById[frontChannel.channelId])) {
            channelsById[frontChannel.channelId] = { "fronts": [], "back": null, channelId: frontChannel.channelId };
        }
        channelsById[frontChannel.channelId].fronts.push(frontChannels[i]);
    }
    for(let i = 0; i < backChannels.length; i++) {
        const backChannel = backChannels[i];
        if(!(channelsById[backChannel.channelId])) {
           throw "Channel Id should exist."
        }
        channelsById[backChannel.channelId].back = backChannel;

    }

    return {
        frontServers,
        backServers,
        frontChannels,
        backChannels,
        channelsById,
    }
}


export function makeRandomMessages(
    minMessages=1, maxMessages=5,
    minKeys=1, maxKeys=5,
    minKeyLength = 5, maxKeyLength=30,
    minValueLength=1, maxValueLength=10000
) {
    const messageCount = getRandomInt(minMessages, maxMessages);

    let messages = [];

    for(let i = 0; i < messageCount; i++) {
        messages[i] = {};
        const keys = getRandomInt(minKeys, maxKeys);
        for(let j = 0; j < keys; j++) {
            let randomKey = randomString(minKeyLength, maxKeyLength);
            let randomValue = randomString(minValueLength, maxValueLength);
            messages[i][randomKey] = randomValue
        }
    }
    return messages;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


export function getRandomChannelIds(channelsById, number=1) {
    let channelIds = Object.keys(channelsById);

    if(channelIds.length < number) {
        throw "Can't get more channels then you've made dummy.";
    }
    let gottenIds = [];
    for(let i = 0; i < number; i++) {
        const { id, index } = getRandomChannelId(channelIds);
        // splice so don't get duplicates.
        channelIds.splice(index, 1);
        gottenIds.push(id);
    }

    const channels = gottenIds.map(id => {
        return channelsById[id];
    });

    return channels;
}

function getRandomChannelId(channelIds) {
    const index = getRandomInt(0, channelIds.length - 1);
    const id = channelIds[index];
    return { id, index };
}

function randomString(min, max) {

    const letters = getRandomInt(min, max);

    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    for (var i = 0; i < letters; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

export const arrayAverage = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;

export function formatBytes(bytes,decimals) {
    if(bytes == 0) return '0 Bytes';
    var k = 1024,
        dm = decimals <= 0 ? 0 : decimals || 2,
        sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
