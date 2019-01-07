import {clearInterval} from "timers";
import { ChannelCluster } from '../src/core/ChannelCluster';
import * as msgpack from 'notepack.io';

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

    describe('backChannel getters', () => {
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
        it('sends to all front channels if no second parameter is passed in.', (done) => {
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

        it('only sends to front channels specified by uid as the second parameter.', (done) => {
            let actualReceived = 0;

            // get random front channels to send to.
            const randomUids = frontChannels.reduce((uids, frontChannel) => {
                if(Math.random() > .8) {
                    uids.push(frontChannel.frontUid)
                }
                return uids
            }, []);

            frontChannels.forEach(frontChannel => {
                frontChannel.onMessage((message, channelId) => {
                    actualReceived += message;
                    assert.strictEqual(channelId, backChannels[0].channelId);
                    if(actualReceived === randomUids.length) {
                        setTimeout(() => {
                            assert.strictEqual(actualReceived, randomUids.length);
                            done();
                        }, 50)
                    }
                });
            });

            backChannels[0].broadcast(1, randomUids);
        });
    });

    describe('backChannel.broadcastMirrored', () => {
        it('sends to all front channels with same channelId as back', (done) => {
            let actualReceived = 0;
            let expectedReceive = options.frontServers;

            frontChannels.forEach(frontChannel => {
                frontChannel.onMessage((message, channelId) => {
                    assert.strictEqual(frontChannel.channelId, channelId);
                    assert.strictEqual(frontChannel.channelId, backChannels[0].channelId);
                    actualReceived+=message;
                    if(actualReceived === expectedReceive) {
                        setTimeout(() => {
                            assert.strictEqual(actualReceived, expectedReceive);
                            done();
                        }, 50)
                    }
                });
            });
            backChannels[0].broadcastMirrored(1);
        });
    });

    describe('backChannel.setState', () => {
        it('sets and gets state correctly', (done) => {
            backChannels[0].setState({ 'foo': 'bar' });
            assert.deepStrictEqual(backChannels[0].state, {'foo':'bar'});
            done();
        })
    });

    describe('backChannel.broadcastState', () => {
        it('throws if state is null', (done) => {
            backChannels[0].setState(null);
            assert.throws(() => { backChannels[0].broadcastState() });
            done();
        });
        it('sends state to all mirrored front channels', (done) => {
            let actualReceived = 0;
            let expectedReceive = options.frontServers;

            let frontUidsToReceive =  frontChannels.reduce((uids, frontChannel) => {
                if(frontChannel.channelId === backChannels[0].channelId) {
                    uids.push(frontChannel.frontUid)
                }
                return uids
            }, []);

            backChannels[0].setState({ frontUids: [...frontUidsToReceive] });

            frontChannels.forEach(frontChannel => {
                frontChannel.onSetState(state => {
                    state = msgpack.decode(state);
                    assert.strictEqual(state.frontUids.indexOf(frontChannel.frontUid) > -1, true);
                    assert.strictEqual(frontUidsToReceive.indexOf(frontChannel.frontUid) > -1, true);

                    // remove index as we receive it.
                    frontUidsToReceive.splice(frontUidsToReceive.indexOf(frontChannel.frontUid), 1);
                    actualReceived+=1;
                    if(actualReceived === expectedReceive) {
                        setTimeout(() => {
                            assert.strictEqual(actualReceived, expectedReceive);
                            assert.strictEqual(frontUidsToReceive.length, 0);
                            done();
                        }, 50)
                    }
                });
            });

            backChannels[0].broadcastState();
        });
    });
    describe('backChannel.broadcastPatch', () => {
        it('throws if state is null', (done) => {
            backChannels[0].setState(null);
            assert.throws(() => { backChannels[0].broadcastPatch() });
            done();
        });
        it('returns false if theres no state differences', (done) => {
            backChannels[0].setState({ "foo": "bar" });
            backChannels[0].setState({ "foo": "bar" });
            assert.strictEqual(backChannels[0].broadcastPatch(), false);
            done();
        });
        it('returns true if state was changed', (done) => {
            backChannels[0].setState({ "foo": "bar" });
            backChannels[0].state.foo = "baz";
            assert.strictEqual(backChannels[0].broadcastPatch(), true);
            done();
        });
    });
});
