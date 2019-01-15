import * as msgpack from 'notepack.io';

import Client from '../src/core/Client';
import FrontChannel from '../src/core/Front/FrontChannel';
import BackChannel from '../src/core/Back/BackChannel';
import { STATE_UPDATE_TYPES } from '../src/core/types';

import { FrontMasterChannel } from '../src/core/Front/FrontMaster/MasterChannel';
import { BackMasterChannel } from '../src/core/Back/BackMaster/MasterChannel';

import { Messenger } from 'centrum-messengers/dist/core/Messenger';

import * as assert from 'assert';
import * as mocha from 'mocha';
import * as sinon from 'sinon';

const TEST_FRONT_URI = 'tcp://127.0.0.1:4000';
const TEST_BACK_URI = 'tcp://127.0.0.1:5000';

describe('Client', function() {
    let client: Client;
    let undefinedClient: Client;

    let FrontMaster: FrontMasterChannel;
    let BackMaster: BackMasterChannel;
    let FrontChannel1: FrontChannel;
    let FrontChannel2: FrontChannel;
    let BackChannel1: BackChannel;
    let BackChannel2; BackChannel;

    // SPIES
    let BackMaster_addedClientLinkSpy;
    let BackMaster_removedClientLinkSpy;
    let BackChannel1_acceptClientLinkSpy;
    let BackChannel2_acceptClientLinkSpy;
    let FrontChannel1_disconnectClientSpy;
    let FrontChannel1_unlinkSpy;
    let FrontMaster_clientConnected;
    let FrontMaster_clientDisconnected;

    before('Initialize channels and client.', (done) => {
        const frontMessenger = new Messenger({ id: 'testFront', publish: { pubSocketURI: TEST_FRONT_URI } , subscribe: { pubSocketURIs: [TEST_BACK_URI] } });
        const backMessenger = new Messenger({ id: 'testBack', publish: { pubSocketURI: TEST_BACK_URI } , subscribe: { pubSocketURIs: [TEST_FRONT_URI] } });

        FrontMaster = new FrontMasterChannel([0, 1], 2, 0, frontMessenger);
        BackMaster = new BackMasterChannel([0, 1], 0, backMessenger);

        FrontChannel1 = FrontMaster.frontChannels[0];
        FrontChannel2 = FrontMaster.frontChannels[1];
        BackChannel1 = BackMaster.backChannels[0];
        BackChannel2 = BackMaster.backChannels[1];

        BackMaster_addedClientLinkSpy = sinon.spy(BackMaster, 'addedClientLink');
        BackMaster_removedClientLinkSpy = sinon.spy(BackMaster, 'removedClientLink');
        BackChannel1_acceptClientLinkSpy = sinon.spy(BackChannel1, 'acceptClientLink');
        BackChannel2_acceptClientLinkSpy = sinon.spy(BackChannel2, 'acceptClientLink');
        FrontChannel1_disconnectClientSpy = sinon.spy(FrontChannel1, 'disconnectClient');
        FrontChannel1_unlinkSpy = sinon.spy(FrontChannel1, 'unlink');
        FrontMaster_clientConnected = sinon.spy(FrontMaster, 'clientConnected');
        FrontMaster_clientDisconnected = sinon.spy(FrontMaster, 'clientDisconnected');

        client = new Client('TEST', FrontMaster);

        // should have called the clientConnected function in FrontMaster upon initialization
        sinon.assert.calledOnce(FrontMaster_clientConnected);

        undefinedClient = new Client(null, FrontMaster);

        assert.strictEqual(FrontChannel1.channelId, 0);
        assert.strictEqual(FrontChannel2.channelId, 1);

        assert.strictEqual(BackChannel1.channelId, 0);
        assert.strictEqual(BackChannel2.channelId, 1);

        setTimeout(() => {
            FrontMaster.connect().then(() => {
                done();
            });
        }, 200);
    });

    afterEach(() => {
        FrontChannel1.onConnected(() => {});
        FrontChannel2.onConnected(() => {});
    });

    after(done => {
        FrontMaster.close();
        BackMaster.close();
        setTimeout(() => {
            done();
        }, 200);
    });

    describe('client.connectToChannel', () => {
        it('should get encoded state from async response', (done) => {
            BackChannel1.setState({ "foo": "bar" });
            client.connectToChannel(FrontChannel1).then(encodedState => {
                const state = msgpack.decode(encodedState);
                assert.deepStrictEqual(state, { "foo": "bar" });

                assert.strictEqual(FrontChannel1.connectedClientUids.length, 1);
                assert.strictEqual(FrontChannel1.connectedClientUids[0], client.uid);
                assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel1.channelId), true);
                assert.strictEqual(client.queuedEncodedUpdates[BackChannel1.channelId].length, 1);
                done();
            });
        });
        it('Should have added a linkedClientUid to the back channel', (done) => {
            assert.strictEqual(BackChannel1.linkedClientUids.length, 1);
            assert.strictEqual(BackChannel1.linkedClientUids[0], client.uid);
            done();
        });
        it('should have called the acceptClientLink method in back channel', (done) => {
            sinon.assert.calledOnce(BackChannel1_acceptClientLinkSpy);
            done();
        });
        it('Should have called the addedClientLink method in the back master', (done) => {
            sinon.assert.calledOnce(BackMaster_addedClientLinkSpy);
            done();
        });
        it('Should have correct lookup data in back master linked client data lookup', (done) => {
            assert.strictEqual(BackMaster.linkedClientFrontDataLookup.size, 1);
            const clientData = BackMaster.linkedClientFrontDataLookup.get(client.uid);
            assert.strictEqual(clientData.linkCount, 1);
            assert.strictEqual(clientData.frontMasterIndex, FrontMaster.frontMasterIndex);
            done();
        });
        it('throws an error if you are already connected', (done) => {
            client.connectToChannel(FrontChannel1).then(() => {})
            .catch((err) => {
                assert.strictEqual(err.message, 'Client is already in connection state.');
                done();
            });
        });
        it('throws an error if the uid was invalid', (done) => {
            undefinedClient.connectToChannel(FrontChannel1).then(() => {})
                .catch((err) => {
                    assert.strictEqual(err.message, 'Invalid client uid.');
                    done();
                });
        });
    });
    describe('client.setProcessorChannel', () => {
        it('should throw error when trying to send messages without processor channel set', (done) => {
            BackChannel1.onMessage(() => {});
            assert.throws(() => { client.sendLocal("test") }, 'Client must have a channel set as its processor channel to send messages. See Client.setProcessor');
            done();
        });
        it('sets and connects asynchronously if it wasnt connected first', () => {
            BackChannel2.setState({ "foo": "bar" });
            client.setProcessorChannel(FrontChannel2).then(set => {

                assert.strictEqual(FrontChannel2.connectedClientUids.length, 1);
                assert.strictEqual(FrontChannel2.connectedClientUids[0], client.uid);
                assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel1.channelId), true);
                assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel2.channelId), true);
                assert.strictEqual(client.queuedEncodedUpdates[BackChannel1.channelId].length, 1);
                assert.strictEqual(client.queuedEncodedUpdates[BackChannel2.channelId].length, 1);

                assert.strictEqual(set, true);
            })
        });
        it('Back master should not have the count of two for the client link count', (done) => {
            assert.strictEqual(BackMaster.linkedClientFrontDataLookup.size, 1);
            const clientData = BackMaster.linkedClientFrontDataLookup.get(client.uid);
            assert.strictEqual(clientData.linkCount, 2);
            assert.strictEqual(clientData.frontMasterIndex, FrontMaster.frontMasterIndex);
            done();
        });
        it('changes processor channel', (done) => {
            client.setProcessorChannel(FrontChannel1).then(set => {
                assert.strictEqual(set, true);
                done();
            });
        });
    });
    describe('client.addStateUpdate', () => {
        it('adds a set state update', (done) => {
            // should be 2 counting the state that gets added when connectToChannel receives
            const count = client.addStateUpdate(FrontChannel1.channelId,'bur', STATE_UPDATE_TYPES.SET);
            assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel1.channelId), true);
            assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel2.channelId), true);
            assert.strictEqual(client.queuedEncodedUpdates[BackChannel1.channelId].length, 2);
            assert.strictEqual(client.queuedEncodedUpdates[BackChannel2.channelId].length, 1);

            assert.strictEqual(count, 2);
            done();
        });
        it('adds a patch state update', (done) => {
            const count = client.addStateUpdate(FrontChannel1.channelId,'bur', STATE_UPDATE_TYPES.PATCH);

            assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel1.channelId), true);
            assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel2.channelId), true);
            assert.strictEqual(client.queuedEncodedUpdates[BackChannel1.channelId].length, 3);
            assert.strictEqual(client.queuedEncodedUpdates[BackChannel2.channelId].length, 1);
            assert.strictEqual(count, 3);
            done();
        })
    });
    describe('client.clearStateUpdates', () => {
        it('clears all elements in queued updates', (done) => {
            const count_before = client.addStateUpdate(FrontChannel1.channelId,'bur', STATE_UPDATE_TYPES.SET);

            assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel1.channelId), true);
            assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel2.channelId), true);
            assert.strictEqual(client.queuedEncodedUpdates[BackChannel1.channelId].length, 4);
            assert.strictEqual(client.queuedEncodedUpdates[BackChannel2.channelId].length, 1);

            assert.strictEqual(count_before, 4);
            // clears
            client.clearStateUpdates();

            assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel1.channelId), true);
            assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel2.channelId), true);
            assert.strictEqual(client.queuedEncodedUpdates[BackChannel1.channelId].length, 0);
            assert.strictEqual(client.queuedEncodedUpdates[BackChannel2.channelId].length, 0);

            //add one again
            const count_after = client.addStateUpdate(FrontChannel1.channelId,'bur', STATE_UPDATE_TYPES.SET);

            assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel1.channelId), true);
            assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel2.channelId), true);
            assert.strictEqual(client.queuedEncodedUpdates[BackChannel1.channelId].length, 1);
            assert.strictEqual(client.queuedEncodedUpdates[BackChannel2.channelId].length, 0);

            assert.strictEqual(count_after, 1);
            done();
        });
    });
    describe('client.sendLocal', () => {
        it('only sends to processor channel with correct data format', (done) => {
            let received = 0;
            const expectedReceived = 1;
            BackChannel1.onMessage(message => {
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
            // shouldnt reach this
            BackChannel2.onMessage(message => {
                received+=message.message;
            });

            client.sendLocal(1);
            FrontMaster.sendQueuedMessages();
        });
    });
    describe('client.sendGlobal', () => {
        it('is received by all back channels', (done) => {
            let received = 0;
            const expectedReceived = 2;
            BackChannel1.onMessage(message => {
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

            BackChannel2.onMessage(message => {
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
            client.sendGlobal(1);
        });
    });
    describe('client.disconnect', () => {
        it('disconnects client from front channel and then unlinks channel since it was the only client', (done) => {

            // count was 2 on back master
            assert.strictEqual(BackMaster.linkedFrontMasterChannels[FrontMaster.frontMasterIndex].linkedChannelsCount, 2);

            client.disconnect(FrontChannel1.channelId);
            assert.strictEqual(FrontChannel1.connectedClientUids.length, 0);

            sinon.assert.calledOnce(FrontChannel1_disconnectClientSpy);
            setTimeout(() => {
                // front unlink should have been called twice, one for the client unlink
                // and then again for the channel unlink since theres no more clients
                sinon.assert.callCount(FrontChannel1_unlinkSpy, 2);

                // back master should only have 1 front master linked now.
                assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel1.channelId), false);
                assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel2.channelId), true);
                assert.strictEqual(client.queuedEncodedUpdates[BackChannel2.channelId].length, 0);

                assert.strictEqual(BackMaster.linkedFrontMasterChannels[FrontMaster.frontMasterIndex].linkedChannelsCount, 1);
               done();
            }, 50);
        });
        it('Should have removed the linkedClientUid to the back channel', (done) => {
            assert.strictEqual(BackChannel1.linkedClientUids.length, 0);
            done();
        });
        it('Should have called the removedClientLink method in the back master', (done) => {
            sinon.assert.calledOnce(BackMaster_removedClientLinkSpy);
            done();
        });
        it('back master linked client data lookup should only have 1 as the linkCount now', (done) => {
            assert.strictEqual(BackMaster.linkedClientFrontDataLookup.size, 1);
            const clientData = BackMaster.linkedClientFrontDataLookup.get(client.uid);
            assert.strictEqual(clientData.linkCount, 1);
            assert.strictEqual(clientData.frontMasterIndex, FrontMaster.frontMasterIndex);
            done();
        });

        it('disconnects client from all front channels if no param is passed in', (done) => {
            client.connectToChannel(FrontChannel1).then(() => {
                // count became 2 on back master
                assert.strictEqual(BackMaster.linkedFrontMasterChannels[FrontMaster.frontMasterIndex].linkedChannelsCount, 2);
                client.disconnect();
                setTimeout(() => {
                    assert.strictEqual(FrontChannel1.connectedClientUids.length, 0);
                    assert.strictEqual(FrontChannel2.connectedClientUids.length, 0);

                    // should no longer have any channel ids for queued encoded updates.
                    assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel1.channelId), false);
                    assert.strictEqual(client.queuedEncodedUpdates.hasOwnProperty(BackChannel2.channelId), false);

                    // back master should not have any linked front master channels now
                    assert.strictEqual(BackMaster.linkedFrontMasterChannels.hasOwnProperty(FrontMaster.frontMasterIndex), false);
                    done();
                }, 50);
            });
        });
        it('Should have called the .clientDisconnected function in the master front', (done) => {
            sinon.assert.calledOnce(FrontMaster_clientDisconnected);
            done();
        });
        it('Should have removed the linkedClientUid to both of the back channels', (done) => {
            assert.strictEqual(BackChannel1.linkedClientUids.length, 0);
            assert.strictEqual(BackChannel2.linkedClientUids.length, 0);
            done();
        });
        it('Should have called the removedClientLink method in total of 3 times on the back master', (done) => {
            sinon.assert.callCount(BackMaster_removedClientLinkSpy, 3);
            done();
        });
        it('back master linked client data lookup not have the client in lookup anymore', (done) => {
            assert.strictEqual(BackMaster.linkedClientFrontDataLookup.size, 0);
            done();
        });
    });
    describe('client.onMessage and client.onMessageHandler', () => {
        it('Sets the onMessageHandler with onMessage correctly and then calls it correctly', (done) => {
            let called = 0;
            let handler = ((message) => {
                called+=message;
            });

            client.onMessage(handler);
            client.onMessageHandler(1);

            assert.strictEqual(called, 1);
            done();
        });
    });
});
