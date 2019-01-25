import {clearInterval} from "timers";
import * as msgpack from 'notepack.io';

import { FrontChannel } from '../src/core/Front/FrontChannel/FrontChannel';
import { BackChannel } from '../src/core/Back/BackChannel/BackChannel';

import Client from '../src/core/Client';
import { FrontMasterChannel } from '../src/core/Front/FrontMaster/MasterChannel';
import { BackMasterChannel } from '../src/core/Back/BackMaster/MasterChannel';

import { CONNECTION_STATUS } from '../src/core/types';

import * as assert from 'assert';
import * as mocha from 'mocha';

const TEST_FRONT_URI = 'tcp://127.0.0.1:4000';
const TEST_BACK_URI = 'tcp://127.0.0.1:5000';

describe('FrontChannel', function() {
    let BackMaster: BackMasterChannel;
    let FrontMaster: FrontMasterChannel;
    let FrontChannel1: FrontChannel;
    let FrontChannel2: FrontChannel;
    let BackChannel1: BackChannel;
    let BackChannel2; BackChannel;

    let client: Client;

    before('Initialize a centrum messenger for the Front Channels and the Back Channels', (done) => {
        FrontMaster = new FrontMasterChannel(0);
        BackMaster = new BackMasterChannel(0);

        FrontMaster.initialize(TEST_FRONT_URI, [TEST_BACK_URI]);
        FrontMaster.addChannels([0, 1]);

        BackMaster.initialize(TEST_BACK_URI, [TEST_FRONT_URI]);
        BackMaster.addChannels([0, 1]);

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
        BackChannel1.onAddClientListen((...args) => { return true });
    });

    after(done => {
        FrontMaster.disconnect();
        BackMaster.disconnect();
        setTimeout(() => {
            done();
        }, 200);
    });

    describe('FrontChannel.connect', () => {
        let connections = 0;
        it('tests asynchronous connection of 1 channel', (done) => {
            FrontChannel1.connect().then((connected: any) => {
                connections++;
                assert.strictEqual(connected.channelIds.length, 2);
                assert.strictEqual(connected.backMasterIndexes.length, 1);
                assert.strictEqual(connected.channelIds.indexOf(BackChannel1.channelId) > -1, true);
                assert.strictEqual(connected.channelIds.indexOf(BackChannel2.channelId) > -1, true);
                assert.strictEqual(connected.backMasterIndexes[0], BackMaster.backMasterIndex);
                assert.strictEqual(connections, 1);

                setTimeout(() => {

                    assert.strictEqual(connections, 1);
                    done();
                }, 50);
            });
        });

        it('updates the connectionInfo getter correctly', (done) => {
            // 2 because theres two back channels it connects to.
            assert.strictEqual(FrontChannel1.connectionInfo.connectedChannelIds.length, 2);
            assert.strictEqual(FrontChannel1.connectionInfo.connectionStatus, CONNECTION_STATUS.CONNECTED);
            assert.strictEqual(FrontChannel1.connectionInfo.isLinked, false);
            done();
        });

        it('throws an error if you try to connect after already connected', (done) => {
            FrontChannel1.connect().then(() => {})
            .catch(err => {
                assert.strictEqual(err, 'Channel is connected or in the process of connecting.');
                done();
            });
        });
    });

    describe('FrontChannel.onConnected', () => {
        it('tests handler gets called on each successful connection', (done) => {
            let connectionsHandled = 0;
            FrontChannel2.connect().then(() => {
                // 2 since theres 2 BackChannels were connecting to.
                assert.strictEqual(connectionsHandled, 2);
                done();
            });
            FrontChannel2.onConnected(() => {
                connectionsHandled++;
            });
        });
    });

    describe('FrontChannel.linkClient', () => {
        it('link responds asynchronously with a msgpack encoded state and receives correct responseData', (done) => {
            const state = { "foo": "bar" };
            BackChannel1.setState(state);

            BackChannel1.onAddClientListen((clientUid, options) => {
                assert.strictEqual(clientUid, client.uid);
                assert.deepStrictEqual(options, { "foo": "bar" });
                options.foo = 'baz';
                return options;
            });

             FrontChannel1.linkClient(client, { "foo": "bar" }).then(data => {
                 let decoded = msgpack.decode(Buffer.from(data.encodedState));
                 assert.deepStrictEqual(data.responseOptions, { "foo": "baz" });
                 assert.deepStrictEqual(decoded, state);
                 done();
             });
        });
    });

    describe('FrontChannel.unlinkClient', () => {
        it('unlinks the channel', (done) => {
            assert.doesNotThrow(() => { FrontChannel1.unlinkClient(client.uid)  });
            done();
        });
        it('throws if we unlink when were already unlinked', (done) => {
            assert.throws(() => { FrontChannel1.unlinkClient(client.uid)  }, 'Already unlinked!');
            done();
        });
    });

    describe('FrontChannel.onPatchState & FrontChannel.patchState', () => {
        it('does NOT fire off the onPatchState function when patchState is executed because its UNLINKED', (done) => {
            let called = false;

            FrontChannel1.onPatchState((patch) => {
                called = patch;
            });

            FrontChannel1.patchState(true);
            assert.strictEqual(called, false);
            done();
        });

        it('does fire off the onPatchState when its linked', (done) => {
            let called = null;
            FrontChannel1.linkClient(client).then(() => {
                console.log('yo');
                FrontChannel1.onPatchState((patch) => {
                    called = patch;
                });

                FrontChannel1.patchState(true);
                assert.strictEqual(called, true);
                done();
            }).catch(err => {
                console.log(err);
            });

        });
    });

    describe('FrontChannel.addMessage', () => {
        it('Throws error because theres no links to any back channels', (done) => {
            FrontChannel1.unlinkClient(client.uid);
            assert.throws(() => { FrontChannel1.addMessage([{"foo": "bar"}]) });
            done();
        });
        it('Doesnt throw after linking.', (done) => {
            FrontChannel1.linkClient(client).then(() => {
                assert.doesNotThrow(() => { FrontChannel1.addMessage([{"foo": "bar"}]) });
                done();
            });
        });
    });

    describe('FrontChannel.send', () => {
        it('sends correct data to mirrored back channel when no backChannelId is passed in as a param', (done) => {
            const sent = 'test';
            BackChannel1.onMessage((message) => {
                assert.strictEqual(message[0], sent);
                done();
            });
            FrontChannel1.send([sent]);
        });
        it('sends correct data to remote back channel if channel id is specified', (done) => {
            const sent = 'test2';
            BackChannel2.onMessage((message) => {
                assert.strictEqual(message[0], sent);
                done();
            });
            FrontChannel1.send([sent], BackChannel2.channelId);
        });
    });

    describe('FrontChannel.broadcast', () => {
        it('sends to all back channels if no backChannelIds were passed in as second param', (done) => {
            let received = 0;
            let expectedReceived = 2;
            BackChannel1.onMessage((message) => {
                received += message[0];
                if (received === expectedReceived) {
                    setTimeout(() => {
                        assert.strictEqual(received, expectedReceived);
                        done();
                    }, 50)
                }
            });
            BackChannel2.onMessage((message) => {
                received += message[0];
                if (received === expectedReceived) {
                    setTimeout(() => {
                        assert.strictEqual(received, expectedReceived);
                        done();
                    }, 50)
                }
            });
            FrontChannel1.broadcast([1]);
        });
        it('only sends to back channels with channelIds passed in as second param', (done) => {
            let received = 0;
            let expectedReceived = 2;
            BackChannel1.onMessage((message) => {
                received += message[0];
                if (received === expectedReceived) {
                    setTimeout(() => {
                        assert.strictEqual(received, expectedReceived);
                        done();
                    }, 50)
                }
            });
            BackChannel2.onMessage((message) => {
                received += message[0];
                if (received === expectedReceived) {
                    setTimeout(() => {
                        assert.strictEqual(received, expectedReceived);
                        done();
                    }, 50)
                }
            });
            FrontChannel1.broadcast([1], [BackChannel1.channelId, BackChannel2.channelId]);
        })
    });
});
