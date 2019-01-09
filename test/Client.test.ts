import {clearInterval} from "timers";
import { ChannelCluster } from '../src/ChannelCluster';
import { Client } from '../src/core/Client';

import * as msgpack from 'notepack.io';

const { TEST_CLUSTER_OPTIONS, applyPatches } = require('./testHelpers');
const options = TEST_CLUSTER_OPTIONS;
import * as assert from 'assert';
import * as mocha from 'mocha'
import * as fs from 'fs';
import * as path from 'path';

let frontServers, frontChannels, backServers, backChannels, channelsById;

describe('Client', function() {
    let cluster: ChannelCluster;
    let client: Client;

    before('Creates Channel Cluster and connects all the front servers and creates a client.', function(done) {
        this.timeout(10000);

        client = new Client('TEST');
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

    describe('client.connectToChannel', () => {
        it('should get encoded state from async response', (done) => {
            backChannels[0].setState({ "foo": "bar" });
            channelsById[frontChannels[frontChannels.length - 1].channelId].back.setState({ "foo": "bar" });
            backChannels[0].setState({ "foo": "bar" });
            client.connectToChannel(frontChannels[0]).then(encodedState => {
                const state = msgpack.decode(encodedState);
                assert.deepStrictEqual(state, { "foo": "bar" });
                done();
            });
        });
    });
    describe('client.setProcessorChannel', () => {
        it('should throw error when trying to send messages without processor channel set', (done) => {
            backChannels[0].onMessage(() => {});
            assert.throws(() => { client.sendLocal("test") }, 'Client must have a channel set as its processor channel to send messages. See Client.setProcessor');
            done();
        });
        it('sets and connects asynchronously if it wasnt connected first', () => {
            client.setProcessorChannel(frontChannels[frontChannels.length - 1]).then(set => {
                assert.strictEqual(set, true);
            })
        });
        it('doesnt throw after processer channel is set back', (done) => {
            backChannels[0].onMessage(() => {});
            client.setProcessorChannel(frontChannels[0]).then(set => {
                assert.strictEqual(set, true);
                assert.doesNotThrow(() => { client.sendLocal("test") });
                done();
            });
        });
    });
    describe('client.addEncodedStateSet', () => {
        it('adds an element to the queued updates', (done) => {
            // should be 2 counting the state that gets added when connectToChannel receives
            const count = client.addEncodedStateSet(frontChannels[0].channelId, 'bur');
            assert.strictEqual(count, 2);
            done();
        });
    });
    describe('client.addEncodedStatePatch', () => {
        it('adds an element to the queued updates', (done) => {
            const count = client.addEncodedStatePatch(frontChannels[0].channelId,'bur');
            assert.strictEqual(count, 3);
            done();
        });
    });
    describe('client.clearEncodedStateUpdates', () => {
        it('clears all elements in queued updates', (done) => {
            const count_before = client.addEncodedStatePatch(frontChannels[0].channelId,'bur');
            assert.strictEqual(count_before, 4);
            // clears
            client.clearEncodedStateUpdates();
            //add one again
            const count_after = client.addEncodedStatePatch(frontChannels[0].channelId,'bur');
            assert.strictEqual(count_after, 1);
            done();
        });
    });
    describe('client.sendLocal', () => {
        it('only sends to processor channel with correct data format', (done) => {
            let received = 0;
            const expectedReceived = 1;
            backChannels.forEach((backChannel) => {
                backChannel.onMessage(message => {
                    console.log('onmsg');
                    assert.strictEqual(message.message, 1);
                    assert.strictEqual(message.clientUid, client.uid);
                    assert.strictEqual(backChannel.channelId, backChannels[0].channelId);
                    received+=message.message;
                    if(received === expectedReceived) {
                        setTimeout(() => {
                            assert.strictEqual(received, expectedReceived);
                            done();
                        }, 20);
                    }
                });
            });
            // need to have front server push out message queue
            // clear since we added from previous test
            frontChannels[0].clearQueued();

            // queues
            client.sendLocal(1);

            // sends
            frontChannels[0].sendQueued();
        });
    });
    describe('client.sendGlobal', () => {
        it('is received by all back channels', (done) => {
            let received = 0;
            const expectedReceived = backChannels.length;
            backChannels.forEach((backChannel) => {
                backChannel.onMessage(message => {
                    assert.strictEqual(message.message, 1);
                    assert.strictEqual(message.clientUid, client.uid);
                    received+=message.message;
                    if(received === expectedReceived) {
                        setTimeout(() => {
                            assert.strictEqual(received, expectedReceived);
                            done();
                        }, 20);
                    }
                });
            });
            client.sendGlobal(1);
        });
    });
});
