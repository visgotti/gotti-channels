import {clearInterval} from "timers";
import * as msgpack from 'notepack.io';

import Client from '../src/core/Client';

import { FrontChannel } from '../src/core/Front/FrontChannel/FrontChannel';
import { BackChannel } from '../src/core/Back/BackChannel/BackChannel';

import { FrontMasterChannel } from '../src/core/Front/FrontMaster/MasterChannel';
import { BackMasterChannel } from '../src/core/Back/BackMaster/MasterChannel';

import * as assert from 'assert';
import * as mocha from 'mocha';

const TEST_FRONT_URI = 'tcp://127.0.0.1:4000';
const TEST_BACK_URI = 'tcp://127.0.0.1:5000';

describe('FrontChannel', function() {

    let FrontMaster: FrontMasterChannel;
    let BackMaster: BackMasterChannel;
    let FrontChannel1: FrontChannel;
    let FrontChannel2: FrontChannel;
    let BackChannel1: BackChannel;
    let BackChannel2; BackChannel;
    let client: Client;

    before('Initialize front/back channels and front/back master channels.', (done) => {
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
    });

    after(done => {
        FrontMaster.disconnect();
        BackMaster.disconnect();
        setTimeout(() => {
            done();
        }, 200);
    });
    describe('FrontMaster.connect', () => {
        it('asynchronously connects each (2) front channels to all (2) back channels', (done) => {
            let expected = 4;
            let actual = 0;
            FrontChannel1.onConnected(() => {
                actual++;
            });
            FrontChannel2.onConnected(() => {
                actual++;
            });

            FrontMaster.connect().then(() => {
                assert.strictEqual(FrontMaster.connectedBackMasters.length, 1);
                assert.strictEqual(FrontMaster.connectedBackMasters[0], BackMaster.backMasterIndex);
                assert.strictEqual(expected, actual);
                done();
            });
        });
    });


    describe('FrontMaster.linkChannel FrontMaster.unlinkChannel', () => {
        it('FrontMaster.linkChannel with new back master index correctly adds data in the lookup with count as 1 and an empty message queue', (done) => {
            assert.strictEqual(FrontMaster.linkedBackMasterLookup.hasOwnProperty(BackMaster.backMasterIndex), false);
            FrontMaster.linkChannel(BackMaster.backMasterIndex);
            assert.strictEqual(FrontMaster.linkedBackMasterLookup.hasOwnProperty(BackMaster.backMasterIndex), true);
            let keysCounted = 0;
            for(let key in FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex]) {
                keysCounted++;
            }
            // make sure has correct keys with correct values
            assert.strictEqual(keysCounted, 2);
            assert.strictEqual(FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex].hasOwnProperty('linkedChannelsCount'), true);
            assert.strictEqual(FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex].hasOwnProperty('queuedMessages'), true);

            assert.strictEqual(FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex].linkedChannelsCount, 1);
            assert.deepStrictEqual(FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex].queuedMessages, []);

            // add another link from same master index and make sure things get updated properly.
            done();
        });
        it('FrontMaster.linkChannel updates count to 2 when another channel with the same back master index links', (done) => {
            FrontMaster.linkChannel(BackMaster.backMasterIndex);
            assert.strictEqual(FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex].linkedChannelsCount, 2);
            assert.deepStrictEqual(FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex].queuedMessages, []);
            done();
        });
        it('FrontMaster.unlinkChannel updates count in lookup to 1 when one of the back master indexes is removed', (done) => {
            FrontMaster.unlinkChannel(BackChannel1.backMasterIndex);
            assert.strictEqual(FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex].linkedChannelsCount, 1);
            assert.deepStrictEqual(FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex].queuedMessages, []);
            done();
        });
        it('FrontMaster.unlinkChannel completely removes backMasterIndex from lookup when the count reaches 0', (done) => {
            FrontMaster.unlinkChannel(BackChannel1.backMasterIndex);
            assert.strictEqual(FrontMaster.linkedBackMasterLookup.hasOwnProperty(BackMaster.backMasterIndex), false);
            done();
        });
        it('FrontMaster.linkChannel gets called when child FrontChannel1 links asynchronously', (done) => {
            BackChannel1.setState({ "foo": "bar" });
            assert.strictEqual(FrontMaster.linkedBackMasterLookup.hasOwnProperty(BackMaster.backMasterIndex), false);
            FrontChannel1.linkClient(client).then(() => {
                FrontMaster.linkChannel(BackMaster.backMasterIndex);
                assert.strictEqual(FrontMaster.linkedBackMasterLookup.hasOwnProperty(BackMaster.backMasterIndex), true);
                done();
            })
        });
        it('FrontMaster.unlinkChannel gets called when child FrontChannel1 unlinks', (done) => {
            assert.strictEqual(FrontMaster.linkedBackMasterLookup.hasOwnProperty(BackMaster.backMasterIndex), true);
            FrontChannel1.unlinkClient(client.uid);
            FrontMaster.unlinkChannel(BackChannel1.backMasterIndex);
            assert.strictEqual(FrontMaster.linkedBackMasterLookup.hasOwnProperty(BackMaster.backMasterIndex), false);
            done();
        })
    });

    describe('FrontMaster.addQueuedMessage, FrontMaster.sendQueuedMessages', () => {
        it('FrontMaster.addQueuedMessage fails because none of the channels linked to the back', (done) => {
            assert.throws(() => { FrontMaster.addQueuedMessage([{"foo": "bar"}], BackMaster.backMasterIndex, FrontChannel1.channelId)});
            done();
        });
        it('doesnt fail after linking one of the channels', (done) => {
            BackChannel1.setState({ "foo": "baz" });
            FrontChannel1.linkClient(client).then(() => {
                assert.doesNotThrow(() => { FrontMaster.addQueuedMessage([{"foo": "bar"}], FrontChannel1.channelId, BackMaster.backMasterIndex)} );
                done();
            });
        });
        it('has 1 message in the message queue for the master index', (done) => {
            assert.strictEqual(FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex].queuedMessages.length, 1);
            done();
        });
        it('message in the message queue has correct data', (done) => {
            assert.deepStrictEqual(FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex].queuedMessages[0][0], {"foo": "bar"});
            assert.deepStrictEqual(FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex].queuedMessages[0][1], ''); // empty since its not from client
            assert.deepStrictEqual(FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex].queuedMessages[0][2], FrontChannel1.channelId); //where the channel needs to be delivered to when it reaches back channel

            done();
        });
        it('FrontMaster.sendQueuedMessages empties queue and BackChannel1 receives the message', (done) => {
            BackChannel1.onMessage((message) => {
                assert.deepStrictEqual(message[0], {"foo": "bar"});
                done();
            });
            FrontMaster.sendQueuedMessages();
            assert.strictEqual(FrontMaster.linkedBackMasterLookup[BackMaster.backMasterIndex].queuedMessages.length, 0);
        });
    });
});
