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

    describe('backChannel.broadcastLinked with NO LINKED FRONTS', () => {
        it('no channels receive the broadcast', (done) => {
            let actualReceived = 0;
            let expectedReceive = 0;

            frontChannels.forEach(frontChannel => {
                frontChannel.onMessage((message, channelId) => {
                    assert.strictEqual(frontChannel.channelId, channelId);
                    assert.strictEqual(frontChannel.channelId, backChannels[0].channelId);
                    actualReceived+=message;
                });
            });
            backChannels[0].broadcastLinked(1);

            setTimeout(() => {
                assert.strictEqual(actualReceived, expectedReceive);
                done();
            }, 100);
        });
    });

    describe('backChannel.broadcastLinked with LINKED FRONT', () => {
        it('sends to all front channels since theyre all connected as well as a state broadcast when they connect', (done) => {
            backChannels[0].setState({ "foo": "bar" });

            setTimeout(() => {

            }, 1000);

            let expectedReceive = options.frontServers;

            let broadcastsReceived = 0;
            let statesReceived = 0;

            frontChannels.forEach(frontChannel => {
                if(frontChannel.channelId === backChannels[0].channelId) {
                    frontChannel.link();
                }
                frontChannel.onMessage((message, channelId) => {
                    assert.strictEqual(frontChannel.channelId, channelId);
                    assert.strictEqual(frontChannel.channelId, backChannels[0].channelId);
                    broadcastsReceived+=message;
                });
                frontChannel.onSetState((newState) => {
                    statesReceived+=1;
                });
            });

            setTimeout(() => {
                backChannels[0].broadcastLinked(1);
            }, 100);

            setTimeout(() => {
                assert.strictEqual(broadcastsReceived, expectedReceive);
                assert.strictEqual(statesReceived, expectedReceive);
                done();
            }, 200);
        });
    });

    describe('backChannel.setState', () => {
        it('sets and gets state correctly', (done) => {
            backChannels[0].setState({ 'foo': 'bar' });
            assert.deepStrictEqual(backChannels[0].state, {'foo':'bar'});
            done();
        })
    });

    describe('backChannel.sendState', () => {
        it('throws if state is null', (done) => {
            backChannels[0].setState(null);
            assert.throws(() => { backChannels[0].sendState() });
            done();
        });
        it('sends state to linked front channels', (done) => {
            let actualReceived = 0;
            let expectedReceive = options.frontServers;


            backChannels[0].setState({ "foo": "bar" });

            frontChannels.forEach(frontChannel => {
                if(frontChannel.channelId === backChannels[0].channelId) {
                    backChannels[0].sendState(frontChannel.frontUid);
                }
                frontChannel.onSetState(state => {
                   actualReceived++;
                   if(actualReceived === expectedReceive) {
                       setTimeout(() => {
                           assert.strictEqual(actualReceived, expectedReceive);
                           done();
                       }, 100)
                   }
                });
            });
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
