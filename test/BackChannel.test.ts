import {clearInterval} from "timers";
import { ChannelCluster } from '../src/core/ChannelCluster';

const { TEST_CLUSTER_OPTIONS, makeRandomMessages, arrayAverage, getRandomChannelIds, formatBytes } = require('./testHelpers');
const options = TEST_CLUSTER_OPTIONS;
import * as assert from 'assert';
import * as mocha from 'mocha'
import * as fs from 'fs';
import * as path from 'path';

let frontServers, frontChannels, backServers, backChannels, channelsById;

describe('BackChannel', function() {
    let cluster: ChannelCluster;

    before('Creates Channel Cluster and connects all the front servers.', function(done) {
        this.timeout(10000);
        cluster = new ChannelCluster(options);
        ({ frontServers, frontChannels, backServers, backChannels, channelsById } = cluster.createChannels());

        setTimeout(() => {
            cluster.connectAll().then(connected => {
                if(connected) {
                    done();
                }
            });
        }, 250);
    });

    after(done => {
        cluster.closeAll();
        setTimeout(() => {
            done();
        }, 50);
    });

    describe('backChannel getters should be accurate after connections', () => {
        it('backChannel.mirroredFrontUids has one for each front server made.', (done) => {
            backChannels.forEach(backChannel => {
                assert.strictEqual(backChannel.mirroredFrontUids.length, options.frontServers)
            });
            done();
        });
        it('backChannel.connectedFrontsData has data for each frontUid', (done) => {
            backChannels.forEach(backChannel => {
                const dataMap = backChannel.connectedFrontsData;

                const keys = Array.from(dataMap.keys());

                assert.strictEqual(keys.length, frontChannels.length);
            });
            done();
        });
    });

    describe('backChannel.send', () => {
        it('tests it sends to correct frontUid with correct data', (done) => {
            frontChannels[0].onMessage((message, channelId) => {
                assert.strictEqual(channelId, backChannels[0].channelId);
                assert.deepStrictEqual(message, { "foo": "bar"});
                done();
            });
            backChannels[0].send({ "foo": "bar"}, frontChannels[0].frontUid)
        });
    });

    describe('backChannel.broadcast', () => {
        it('sends to all front channels if no second parameter is passed in', (done) => {
            let actualReceived = 0;
            // each front channel should get it
            const expectedReceived = frontChannels.length;

            frontChannels.forEach(frontChannel => {
                frontChannel.onMessage((message, channelId) => {
                    assert.strictEqual(channelId, backChannels[0].channelId);
                    actualReceived += message;
                    if(actualReceived === expectedReceived) {
                        setTimeout(() => {
                            assert.strictEqual(actualReceived, expectedReceived);
                            done();
                        }, 50)
                    }
                });
            });
            backChannels[0].broadcast(1);
        });
    });

    describe('backChannel.broadcastPatchedState', () => {
        it('tests only mirrored front channels get patched state', (done) => {
            done();
        })
    });

    describe('backChannel.sendQueued', () => {
        it('All front channels correctly send all queued messages to back mirror channel', (done) => {
            done();
        });
    });

    describe('backChannel.send', () => {
        it('sends to mirrored back channel when no backChannelId is passed in as a param', (done) => {
            done();
        })
    });
    describe('backChannel.broadcast', () => {
        it('sends to all back channels if no backChannelIds were passed in as second param', (done) => {
            done();
        });
    });
});
