import { ChannelCluster } from '../src/core/ChannelCluster';

const { TEST_CLUSTER_OPTIONS, makeRandomMessages, arrayAverage, getRandomChannelIds, formatBytes } = require('./testHelpers');
const options = TEST_CLUSTER_OPTIONS;

import * as assert from 'assert';
import * as mocha from 'mocha';

describe('ChannelCluster', function() {

    let frontServers, frontChannels, backServers, backChannels, channelsById;

    let cluster: ChannelCluster;
    before('Initialize cluster', (done) => {
        cluster = new ChannelCluster(options);
        setTimeout(() => {
            done();
        }, 50);
    });

    after((done) => {
        cluster.closeAll();
        setTimeout(() => {
            done();
        }, 50);
    });

    it('cluster.createChannels creates correct output', (done) => {
        ({ frontServers, frontChannels, backServers, backChannels, channelsById } = cluster.createChannels());

        assert.strictEqual(frontServers.length, options.frontServers);
        assert.strictEqual(backServers.length, options.backServers);

        let frontServerChannelCountMap = new Map();
        for(let i = 0; i < frontChannels.length; i++) {
            if(!(frontServerChannelCountMap.has(frontChannels[i].serverId))) {
                frontServerChannelCountMap.set(frontChannels[i].serverId, 0);
            }
            let count =frontServerChannelCountMap.get(frontChannels[i].serverId);
            frontServerChannelCountMap.set(frontChannels[i].serverId, ++count);
        }

        const frontKeys = Array.from(frontServerChannelCountMap.keys());
        assert.strictEqual(frontKeys.length, options.frontServers);
        frontKeys.forEach(key => {
            // each front server gets all channels.
            assert.strictEqual(frontServerChannelCountMap.get(key), options.totalChannels);
        });

        let backServerChannelCountMap = new Map();
        for(let i = 0; i < backChannels.length; i++) {
            if(!(backServerChannelCountMap.has(backChannels[i].serverId))) {
                backServerChannelCountMap.set(backChannels[i].serverId, 0);
            }
            let count =backServerChannelCountMap.get(backChannels[i].serverId);
            backServerChannelCountMap.set(backChannels[i].serverId, ++count);
        }

        const backKeys = Array.from(backServerChannelCountMap.keys());
        assert.strictEqual(backKeys.length, options.backServers);
        backKeys.forEach(key => {
            // back channels should be dispersed evenly amongst servers.
            assert.strictEqual(backServerChannelCountMap.get(key), options.totalChannels / options.backServers);
        });

        for(let i = 0; i < frontChannels.length; i++) {
            assert.strictEqual(frontChannels[i].channelId in channelsById, true);
            // each front server should have one of each channel
            assert.strictEqual(channelsById[frontChannels[i].channelId].fronts.length, options.frontServers);
        }

        for(let i = 0; i < backChannels.length; i++) {
            assert.strictEqual(backChannels[i].channelId in channelsById, true);
            assert.notDeepStrictEqual(channelsById[backChannels[i].channelId].back, null);
        }

        setTimeout(() => {
            done();
        }, 200);
    });

    it('cluster.connectAll returns asynchronously', (done) => {
        cluster.connectAll().then(connected => {
            assert.strictEqual(connected, true);
            done();
        });
    }).timeout(5000);
});