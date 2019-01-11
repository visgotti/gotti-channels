import {clearInterval} from "timers";
import * as msgpack from 'notepack.io';

import FrontChannel from '../src/core/Front/FrontChannel';
import BackChannel from '../src/core/Back/BackChannel';


import { FrontMasterChannel } from '../src/core/Front/FrontMaster/MasterChannel';
import { BackMasterChannel } from '../src/core/Back/BackMaster/MasterChannel';

import { Messenger } from 'centrum-messengers/dist/core/Messenger';

const { TEST_CLUSTER_OPTIONS, makeRandomMessages, arrayAverage, getRandomChannelIds, formatBytes, applyPatches } = require('./testHelpers');
const options = TEST_CLUSTER_OPTIONS;

interface TestFrontMessage {
    message: any,
    frontUid: string,
}

import * as assert from 'assert';
import * as mocha from 'mocha';

const messageFactories = {
    xxsmall: ((minMessages, maxMessages) =>  (makeRandomMessages(minMessages, maxMessages, 1, 1, 1, 1, 1, 1))),
    xsmall: ((minMessages, maxMessages) =>  (makeRandomMessages(minMessages, maxMessages, 3, 5, 5, 10, 15, 25))),
    small: ((minMessages, maxMessages) =>  (makeRandomMessages(minMessages, maxMessages, 15, 50, 10, 30, 100, 300))),
    medium: ((minMessages, maxMessages) =>  makeRandomMessages(minMessages, maxMessages, 30, 70, 10, 30, 200, 500)),
    large: ((minMessages, maxMessages) =>  makeRandomMessages(minMessages, maxMessages, 40, 80, 10, 30, 300, 800)),
    xlarge: ((minMessages, maxMessages) =>  makeRandomMessages(minMessages, maxMessages, 50, 90, 10, 30, 500, 1000)),
};

const messageFactory = messageFactories.xsmall;

const TEST_FRONT_URI = 'tcp://127.0.0.1:4000';
const TEST_BACK_URI = 'tcp://127.0.0.1:5000';

describe('FrontChannel', function() {

    let FrontChannel1: FrontChannel;
    let FrontChannel2: FrontChannel;
    let BackChannel1: BackChannel;
    let BackChannel2; BackChannel;
    before('Initialize a centrum messenger for the Front Channels and the Back Channels', (done) => {
        const frontMessenger = new Messenger({ id: 'testFront', publish: { pubSocketURI: TEST_FRONT_URI } , subscribe: { pubSocketURIs: [TEST_BACK_URI] } });
        const backMessenger = new Messenger({ id: 'testBack', publish: { pubSocketURI: TEST_BACK_URI } , subscribe: { pubSocketURIs: [TEST_FRONT_URI] } });

        const frontMaster = new FrontMasterChannel([0, 1], 2, 0, frontMessenger);
        const backMaster = new BackMasterChannel([0, 1], 0, backMessenger);

        FrontChannel1 = frontMaster.frontChannels[0];
        FrontChannel2 = frontMaster.frontChannels[1];
        BackChannel1 = backMaster.backChannels[0];
        BackChannel2 = backMaster.backChannels[1];

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
        FrontChannel1.onSetState(() => {});
        FrontChannel2.onSetState(() => {});
    });

    after(done => {
        FrontChannel1.close();
        FrontChannel2.close();
        BackChannel1.close();
        BackChannel2.close();
        setTimeout(() => {
            done();
        }, 200);
    });

    describe('frontChannel.connect', () => {
        let connections = 0;
        it.only('tests asynchronous connection of 1 channel', (done) => {
            FrontChannel1.connect().then(() => {
                connections++;
                setTimeout(() => {
                    assert.strictEqual(connections, 1);
                    done();
                }, 50);
            });
        });
    });

    describe('frontChannel.onConnected', () => {
        it.only('tests handler gets called on each successful connection', (done) => {
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

    describe('frontChannel.link', () => {
        it.only('link responds asynchronously with a msgpack encoded state', (done) => {
            const state = { "foo": "bar" };
            BackChannel1.setState(state);

             FrontChannel1.link().then(encodedState => {
                 let decoded = msgpack.decode(encodedState);
                 assert.deepStrictEqual(decoded, state);
                 done();
             });
        });
    });

    describe('frontChannel.unlink', () => {
        it.only('unlinks the channel', (done) => {
            assert.doesNotThrow(() => { FrontChannel1.unlink()  });
            done();
        });
    });

    describe('frontChannel.onPatchState & frontChannel.patchState', () => {
        it.only('fires off the onPatchState function when patchState is executed', (done) => {

            let called = null;
            FrontChannel1.onPatchState((patch) => {
                called = patch;
            });

            FrontChannel1.patchState('test');
            assert.strictEqual(called, 'test');
            done();
        });
    });

    describe('frontChannel.addMessage', () => {
        it.only('Throws error because were not linked to any back channels', (done) => {
            assert.throws(() => { FrontChannel1.addMessage({"foo": "bar"}) });
            done();
        });
        it.only('Doesnt throw after linking.', (done) => {
            FrontChannel1.link();
            assert.doesNotThrow(() => { FrontChannel1.addMessage({"foo": "bar"}) });
            done();
        });
    });

    describe('frontChannel.send', () => {
        it.only('sends correct data to mirrored back channel when no backChannelId is passed in as a param', (done) => {
            const sent = 'test';
            BackChannel1.onMessage((message, frontUid) => {
                assert.strictEqual(message, sent);
                assert.strictEqual(frontUid, FrontChannel1.frontUid);
                assert.strictEqual(BackChannel1.channelId, FrontChannel1.channelId);
                done();
            });
            FrontChannel1.send(sent);
        });
        it.only('sends correct data to remote back channel if channel id is specified', (done) => {
            const sent = 'test2';
            BackChannel2.onMessage((message, frontUid) => {
                assert.strictEqual(message, sent);
                assert.strictEqual(frontUid, FrontChannel1.frontUid);
                assert.notStrictEqual(BackChannel2.channelId, FrontChannel1.channelId);
                done();
            });
            FrontChannel1.send(sent, BackChannel2.channelId);
        });
    })

    describe('frontChannel.broadcast', () => {
        it.only('sends to all back channels if no backChannelIds were passed in as second param', (done) => {
            let received = 0;
            let expectedReceived = 2;
            BackChannel1.onMessage((message, frontUid) => {
                received += message;
                if (received === expectedReceived) {
                    setTimeout(() => {
                        assert.strictEqual(received, expectedReceived);
                        assert.strictEqual(frontUid, FrontChannel1.frontUid);
                        done();
                    }, 50)
                }
            });
            BackChannel2.onMessage((message, frontUid) => {
                received += message;
                if (received === expectedReceived) {
                    setTimeout(() => {
                        assert.strictEqual(received, expectedReceived);
                        assert.strictEqual(frontUid, FrontChannel1.frontUid);
                        done();
                    }, 50)
                }
            });
            FrontChannel1.broadcast(1);
        });
        it.only('only sends to back channels with channelIds passed in as second param', (done) => {
            let received = 0;
            let expectedReceived = 2;
            BackChannel1.onMessage((message, frontUid) => {
                received += message;
                if (received === expectedReceived) {
                    setTimeout(() => {
                        assert.strictEqual(received, expectedReceived);
                        assert.strictEqual(frontUid, FrontChannel1.frontUid);
                        done();
                    }, 50)
                }
            });
            BackChannel2.onMessage((message, frontUid) => {
                received += message;
                if (received === expectedReceived) {
                    setTimeout(() => {
                        assert.strictEqual(received, expectedReceived);
                        assert.strictEqual(frontUid, FrontChannel1.frontUid);
                        done();
                    }, 50)
                }
            });
            FrontChannel1.broadcast(1, [BackChannel1.channelId, BackChannel2.channelId]);
        })
    });

});
