import {clearInterval} from "timers";
import * as msgpack from 'notepack.io';

import Client from '../src/core/Client';
import FrontChannel from '../src/core/Front/FrontChannel';
import BackChannel from '../src/core/Back/BackChannel';


import { FrontMasterChannel } from '../src/core/Front/FrontMaster/MasterChannel';
import { BackMasterChannel } from '../src/core/Back/BackMaster/MasterChannel';

import { Messenger } from 'centrum-messengers/dist/core/Messenger';

import { applyPatches } from './testHelpers';

import * as assert from 'assert';
import * as mocha from 'mocha';
import * as sinon from 'sinon';
const TEST_FRONT_URI = 'tcp://127.0.0.1:4000';
const TEST_BACK_URI = 'tcp://127.0.0.1:5000';

describe('BackMaster', function() {

    let FrontMaster: FrontMasterChannel;
    let BackMaster: BackMasterChannel;
    let FrontChannel1: FrontChannel;
    let FrontChannel2: FrontChannel;
    let BackChannel1: BackChannel;
    let BackChannel2; BackChannel;
    let client1: Client;
    let client2: Client;

    let linkedChannelFromSpy: any;
    let unlinkedChannelFromSpy: any;
    let addStatePatchSpy: any;
    let addedClientLinkSpy: any;
    let removedClientLinkSpy: any;


    before('Initialize front/back channels and front/back master channels.', (done) => {
        const frontMessenger = new Messenger({ id: 'testFront', publish: { pubSocketURI: TEST_FRONT_URI } , subscribe: { pubSocketURIs: [TEST_BACK_URI] } });
        const backMessenger = new Messenger({ id: 'testBack', publish: { pubSocketURI: TEST_BACK_URI } , subscribe: { pubSocketURIs: [TEST_FRONT_URI] } });

        FrontMaster = new FrontMasterChannel([0, 1], 2, 0, frontMessenger);
        BackMaster = new BackMasterChannel([0, 1], 0, backMessenger);

        linkedChannelFromSpy = sinon.spy(BackMaster, 'linkedChannelFrom');
        unlinkedChannelFromSpy = sinon.spy(BackMaster, 'unlinkedChannelFrom');
        addStatePatchSpy = sinon.spy(BackMaster, 'addStatePatch');
        addedClientLinkSpy = sinon.spy(BackMaster, 'addedClientLink');
        removedClientLinkSpy = sinon.spy(BackMaster, 'removedClientLink');


        FrontChannel1 = FrontMaster.frontChannels[0];
        FrontChannel2 = FrontMaster.frontChannels[1];
        BackChannel1 = BackMaster.backChannels[0];
        BackChannel2 = BackMaster.backChannels[1];

        client1 = new Client('1', FrontMaster);
        client2 = new Client('2', FrontMaster);

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

    describe('BackMaster.connectedFrontMasters', () => {
        it('has correct Connected front Master index after connection from just 1 front channel.', (done) => {
            FrontChannel1.connect().then(() => {
                assert.strictEqual(BackMaster.connectedFrontMasters.length, 1);
                assert.strictEqual(BackMaster.connectedFrontMasters[0], FrontMaster.frontMasterIndex);
            });
            done();
        });
        it('still only has 1 front master index when second front channel from same master connects.', (done) => {
            FrontChannel2.connect().then(() => {
                assert.strictEqual(BackMaster.connectedFrontMasters.length, 1);
                assert.strictEqual(BackMaster.connectedFrontMasters[0], FrontMaster.frontMasterIndex);
            });
            done();
        });
    });

    describe('BackMaster.linkedChannelFrom', () => {
        it('Gets called when a frontChannel links', (done) => {
            BackChannel1.setState({ "foo": "bar" });

            client1.linkChannel(FrontChannel1.channelId).then(() => {
                sinon.assert.calledOnce(linkedChannelFromSpy);
                sinon.assert.calledOnce(addedClientLinkSpy);
                done();
            })
        });
        it('linkedFrontMasterChannels getter added frontMasterIndex to channel lookup', (done) => {
            assert.strictEqual(Object.keys(BackMaster.linkedFrontMasterChannels).length, 1);
            assert.strictEqual(BackMaster.linkedFrontMasterChannels.hasOwnProperty(FrontMaster.frontMasterIndex), true);
            assert.strictEqual(BackMaster.linkedFrontMasterChannels[FrontMaster.frontMasterIndex].linkedChannelsCount, 1);
            assert.strictEqual(BackMaster.linkedFrontMasterChannels[FrontMaster.frontMasterIndex].encodedPatches.length, 0);
            done();
        });
        it('linkedFrontMasterIndexesArray getter added frontMasterIndex to array', (done) => {
            assert.strictEqual(BackMaster.linkedFrontMasterIndexesArray.length, 1);
            assert.strictEqual(BackMaster.linkedFrontMasterIndexesArray[0], FrontMaster.frontMasterIndex);
            done();
        });
        it('Gets when the same channel connects another client', (done) => {
            client2.linkChannel(FrontChannel1.channelId).then(() => {
                sinon.assert.callCount(linkedChannelFromSpy, 1);
                sinon.assert.callCount(addedClientLinkSpy, 2);
                done();
            })
        });
        it('linkedFrontMasterChannels updated master lookup channel count correctly', (done) => {
            assert.strictEqual(Object.keys(BackMaster.linkedFrontMasterChannels).length, 1);
            assert.strictEqual(BackMaster.linkedFrontMasterChannels.hasOwnProperty(FrontMaster.frontMasterIndex), true);
            assert.strictEqual(BackMaster.linkedFrontMasterChannels[FrontMaster.frontMasterIndex].linkedChannelsCount, 1);
            assert.strictEqual(BackMaster.linkedFrontMasterChannels[FrontMaster.frontMasterIndex].encodedPatches.length, 0);
            done();
        });
        it('linkedFrontMasterIndexesArray getter didnt add anything to array since the frontMaster already has channels linked', (done) => {
            assert.strictEqual(BackMaster.linkedFrontMasterIndexesArray.length, 1);
            assert.strictEqual(BackMaster.linkedFrontMasterIndexesArray[0], FrontMaster.frontMasterIndex);
            done();
        });
    });

    describe('BackMaster.unlinkedChannelFrom', () => {
        it('Gets called when a frontChannel unlinks all of its linked uids', (done) => {
            BackChannel1.setState({ "foo": "bar" });

            client1.unlinkChannel(FrontChannel1.channelId);
            client2.unlinkChannel(FrontChannel1.channelId);

            setTimeout(() => {
                sinon.assert.calledOnce(unlinkedChannelFromSpy);
                sinon.assert.callCount(removedClientLinkSpy, 2);
                done();
            }, 50);
        });
        it('linkedFrontMasterChannels updates channel count correctly', (done) => {
            assert.strictEqual(Object.keys(BackMaster.linkedFrontMasterChannels).length, 0);
            assert.strictEqual(BackMaster.linkedFrontMasterChannels.hasOwnProperty(FrontMaster.frontMasterIndex), false);
            done();
        });
        it('linkedFrontMasterIndexesArray has no more front channels from any front masters linked', (done) => {
            assert.strictEqual(BackMaster.linkedFrontMasterIndexesArray.length, 0);
            done();
        });
        it('Gets called a second time when other frontChannel unlinks', (done) => {
            client2.linkChannel(FrontChannel2.channelId).then(() => {
                client2.unlinkChannel(FrontChannel2.channelId);
                setTimeout(() => {
                    sinon.assert.callCount(unlinkedChannelFromSpy, 2);
                    done();
                }, 50);
            });
        });
        it('linkedFrontMasterChannels has no keys since theres no more channels from master linked', (done) => {
            assert.strictEqual(Object.keys(BackMaster.linkedFrontMasterChannels).length, 0);
            done();
        });
    });

    describe('BackMaster.sendStatePatches', () => {
        before((done) => {
            client1.linkChannel(FrontChannel1.channelId).then(() => {
               done();
            });
        });
        it('only linked front channel receives the patches', (done) => {
            const oldState = { "foo": "bar" };
            let received = 0;
            let expectedReceived = 1;
            BackChannel1.state['foo'] = 'baz';
            BackMaster.sendStatePatches();
            FrontChannel1.onPatchState(patch => {
                received++;
                setTimeout(() => {
                    const newState = applyPatches(oldState, patch);

                    assert.deepStrictEqual(newState, { "foo": "baz" });
                    assert.strictEqual(received, expectedReceived);
                    done();
                }, 50);
            });
            FrontChannel2.onPatchState(patches => {
                received++;
            });
        });

    });

    describe('BackMaster.setStateUpdateInterval', () => {
       it('should send two state patch updates correctly', (done) => {
            let received = 0;

           const oldState = { 'foo': 'bar' };

           BackChannel1.setState(oldState);
           BackChannel1.state['foo'] = 'baz';

           FrontChannel1.onPatchState(patch => {
               if(received === 0) {
                   received++;
                   const newState = applyPatches(oldState, patch);
                   assert.deepStrictEqual(newState, { 'foo': 'baz' });
                   assert.strictEqual(received, 1);
                   BackChannel1.state['foo'] = 'foo';
               } else if(received === 1) {
                   received++;
                   const newState = applyPatches(oldState, patch);
                   assert.deepStrictEqual(newState, { 'foo': 'foo' });
                   assert.strictEqual(received, 2);
                   BackMaster.clearSendStateInterval();
                   done();
               }
           });
           BackMaster.setStateUpdateInterval(5);
       });
    });

    describe('BackMaster.messageClient', () => {
        it('Should return false if the client is not linked', (done) => {
            client1.unlinkChannel(FrontChannel1.channelId);
            setTimeout(() => {
                assert.strictEqual(BackMaster.messageClient(client1.uid, { 'foo': 'bar' } ), false);
                done();
            }, 20)

        });

        it('Should return true if the client was linked', (done) => {
            client1.onMessage(() => {});
            client1.linkChannel(FrontChannel1.channelId).then(() => {
                assert.strictEqual(BackMaster.messageClient(client1.uid, { 'foo': 'bar' } ), true);
                done();
            });
        });
        it('Should succesfully call the clients onMessageHandler', (done) => {
            let called = 0;
            client1.onMessage(message => {
                called+=message;
                setTimeout(() => {
                   assert.strictEqual(called, 1);
                   done();
                }, 30);
            });
            assert.strictEqual(BackMaster.messageClient(client1.uid, 1), true);
        });
    });
});
