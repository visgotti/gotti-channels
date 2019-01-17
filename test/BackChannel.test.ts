import {clearInterval} from "timers";
import * as msgpack from 'notepack.io';

import Client from '../src/core/Client';
import FrontChannel from '../src/core/Front/FrontChannel';
import BackChannel from '../src/core/Back/BackChannel';

import { FrontMasterChannel } from '../src/core/Front/FrontMaster/MasterChannel';
import { BackMasterChannel } from '../src/core/Back/BackMaster/MasterChannel';

import { Messenger } from 'centrum-messengers/dist/core/Messenger';

import * as assert from 'assert';
import * as mocha from 'mocha';


const TEST_FRONT_URI = 'tcp://127.0.0.1:4000';
const TEST_BACK_URI = 'tcp://127.0.0.1:5000';

describe('BackChannel', function() {

    let FrontMaster: FrontMasterChannel;
    let BackMaster: BackMasterChannel;
    let FrontChannel1: FrontChannel;
    let FrontChannel2: FrontChannel;
    let BackChannel1: BackChannel;
    let BackChannel2; BackChannel;

    let client: Client;

    before('Initialize a centrum messenger for the Front Channels and the Back Channels', (done) => {
        const frontMessenger = new Messenger({ id: 'testFront', publish: { pubSocketURI: TEST_FRONT_URI } , subscribe: { pubSocketURIs: [TEST_BACK_URI] } });
        const backMessenger = new Messenger({ id: 'testBack', publish: { pubSocketURI: TEST_BACK_URI } , subscribe: { pubSocketURIs: [TEST_FRONT_URI] } });

        FrontMaster = new FrontMasterChannel([0, 1], 2, 0, frontMessenger);
        BackMaster = new BackMasterChannel([0, 1], 0, backMessenger);

        FrontChannel1 = FrontMaster.frontChannels[0];
        FrontChannel2 = FrontMaster.frontChannels[1];
        BackChannel1 = BackMaster.backChannels[0];
        BackChannel2 = BackMaster.backChannels[1];
        client = new Client('1', FrontMaster);

        assert.strictEqual(FrontChannel1.channelId, 0);
        assert.strictEqual(FrontChannel2.channelId, 1);

        assert.strictEqual(BackChannel1.channelId, 0);
        assert.strictEqual(BackChannel2.channelId, 1);

        setTimeout(() => {
            done();
        }, 200);
    });

    afterEach(() => {
        FrontChannel1.onConnected(() => {});
        FrontChannel2.onConnected(() => {});
    });

    after(done => {
        FrontMaster.disconnect();
        BackMaster.disconnect();
        setTimeout(() => {
            done();
        }, 200);
    });
    describe('BackChannel getters', () => {
        it('BackChannel.mirroredFrontUids is 0 when theres no connections', (done) => {
            assert.strictEqual(BackChannel1.mirroredFrontUids.length, 0);
            done();
        });
        it('BackChannel.mirroredFrontUids is 1 since each front channel is connected', (done) => {
            FrontChannel1.connect().then(() => {
                assert.strictEqual(BackChannel1.mirroredFrontUids.length, 1);
                assert.strictEqual(BackChannel2.mirroredFrontUids.length, 0);
                FrontChannel2.connect().then(() =>{
                    assert.strictEqual(BackChannel1.mirroredFrontUids.length, 1);
                    done();
               })
            });
        });
        it('BackChannel.connectedFrontsData has data for each frontUid regardless of it being a mirror', (done) => {
            const dataMap = BackChannel1.connectedFrontsData;

            const keys = Array.from(dataMap.keys());

            assert.strictEqual(keys.length, 2);
            done();
        });
    });

    describe('BackChannel.send', () => {
        it('tests it sends to correct frontUid with correct data', (done) => {
            FrontChannel1.onMessage((message, channelId) => {
                assert.strictEqual(channelId, BackChannel1.channelId);
                assert.deepStrictEqual(message, { "foo": "bar"});
                done();
            });
            BackChannel1.send({ "foo": "bar"}, FrontChannel1.frontUid)
        });
    });

    describe('BackChannel.broadcast', () => {
        it('sends to all front channels if no second parameter is passed in.', (done) => {
            let actualReceived = 0;
            // each front channel should get it
            const expectedReceived = 2;

            FrontChannel1.onMessage((message, channelId) => {
                assert.strictEqual(channelId, BackChannel1.channelId);
                actualReceived += message;
                if(actualReceived === expectedReceived) {
                    setTimeout(() => {
                        assert.strictEqual(actualReceived, expectedReceived);
                        done();
                    }, 50)
                }
            });

            FrontChannel2.onMessage((message, channelId) => {
                assert.strictEqual(channelId, BackChannel1.channelId);
                actualReceived += message;
                if(actualReceived === expectedReceived) {
                    setTimeout(() => {
                        assert.strictEqual(actualReceived, expectedReceived);
                        done();
                    }, 50)
                }
            });
            BackChannel1.broadcast(1);
        });

        it('only sends to front channels specified by uid as the second parameter.', (done) => {
            let actualReceived = 0;

            FrontChannel2.onMessage((message, channelId) => {
                actualReceived+=message;
                assert.strictEqual(channelId, BackChannel1.channelId)
                assert.strictEqual(actualReceived, 1);
                done();
            });

            BackChannel1.broadcast(1, [FrontChannel2.frontUid]);
        });
    });

    describe('BackChannel.broadcastLinked', () => {
        it('no channels receive the broadcast since none are linked', (done) => {
            let actualReceived = 0;
            let expectedReceive = 0;

            FrontChannel1.onMessage((message, channelId) => {
                assert.strictEqual(FrontChannel1.channelId, channelId);
                assert.strictEqual(FrontChannel1.channelId, BackChannel1.channelId);
                actualReceived+=message;
            });
            BackChannel1.broadcastLinked(1);

            setTimeout(() => {
                assert.strictEqual(actualReceived, expectedReceive);
                done();
            }, 100);
        });
        it('receives the broadcast when linked', (done) => {
            let actualReceived = 0;
            let expectedReceive = 1;

            BackChannel1.setState({ "foo": "bar" });

            FrontChannel1.onMessage((message, channelId) => {
                assert.strictEqual(FrontChannel1.channelId, channelId);
                assert.strictEqual(FrontChannel1.channelId, BackChannel1.channelId);
                actualReceived+=message;

                setTimeout(() => {
                    assert.strictEqual(actualReceived, expectedReceive);
                    done();
                }, 100);
            });

            FrontChannel1.linkClient(client).then(() => {
                BackChannel1.broadcastLinked(1);
            });
        });
    });

    describe('BackChannel.onAddClientListen', () => {
        it('correctly registers a handler for the add_client_listen event', (done) => {
            const mockUid = 'client_foo';
            const mockOptions = {
                'foo': 'bar'
            };
            BackChannel1.onAddClientListen((clientUid, options?) => {
                assert.strictEqual(clientUid, mockUid);
                assert.deepStrictEqual(options, mockOptions);
                done();
            });
            BackChannel1.emit('add_client_listen', FrontChannel1.frontUid, mockUid, 'mock_state', mockOptions);
        });
    });

    describe('BackChannel.onRemoveClientListen', () => {
        it('correctly registers a handler for the remove_client_listen event', (done) => {
            const mockUid = 'client_foo';
            const mockOptions = {
                'foo': 'bar'
            };
            BackChannel1.onRemoveClientListen((clientUid, options?) => {
                assert.strictEqual(clientUid, mockUid);
                assert.deepStrictEqual(options, mockOptions);
                done();
            });
            BackChannel1.emit('remove_client_listen', mockUid, mockOptions);
        });
    });

    describe('BackChannel.onAddClientWrite', () => {
        it('correctly registers a handler for the add_client_write event', (done) => {
            const mockUid = 'client_foo';
            const mockOptions = {
                'foo': 'bar'
            };
            BackChannel1.onAddClientWrite((clientUid, options?) => {
                assert.strictEqual(clientUid, mockUid);
                assert.deepStrictEqual(options, mockOptions);
                assert.strictEqual(BackChannel1.writingClientUids.length, 1);
                assert.strictEqual(BackChannel1.writingClientUids[0], mockUid);
                done();
            });
            BackChannel1.emit('add_client_write', mockUid, mockOptions);
        });
    });

    describe('BackChannel.onRemoveClientWrite', () => {
        it('correctly registers a handler for the remove_client_write event', (done) => {
            const mockUid = 'client_foo';
            const mockOptions = {
                'foo': 'bar'
            };
            BackChannel1.onRemoveClientWrite((clientUid, options?) => {
                assert.strictEqual(clientUid, mockUid);
                assert.deepStrictEqual(options, mockOptions);
                assert.strictEqual(BackChannel1.writingClientUids.length, 0);
                done();
            });
            BackChannel1.emit('remove_client_write', mockUid, mockOptions);
        });
    });
});