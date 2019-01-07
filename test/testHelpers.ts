export const TEST_CLUSTER_OPTIONS = {
    frontServers: 5,
    backServers: 10,
    totalChannels: 100,
    startingBackPort: 4000,
    startingFrontPort: 5000,
    host: 'tcp://127.0.0.1:',
};

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
