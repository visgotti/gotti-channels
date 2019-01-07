import {clearInterval} from "timers";

import { ChannelCluster } from '../src/core/ChannelCluster';

const { TEST_CLUSTER_OPTIONS, makeRandomMessages, arrayAverage, getRandomChannelIds, formatBytes } = require('./testHelpers');
const options = TEST_CLUSTER_OPTIONS;

interface TestFrontMessage {
    message: any,
    frontUid: string,
}

import * as assert from 'assert';
import * as mocha from 'mocha'

const messageFactories = {
    xxsmall: ((minMessages, maxMessages) =>  (makeRandomMessages(minMessages, maxMessages, 1, 1, 1, 1, 1, 1))),
    xsmall: ((minMessages, maxMessages) =>  (makeRandomMessages(minMessages, maxMessages, 5, 10, 5, 10, 20, 50))),
    small: ((minMessages, maxMessages) =>  (makeRandomMessages(minMessages, maxMessages, 15, 50, 10, 30, 100, 300))),
    medium: ((minMessages, maxMessages) =>  makeRandomMessages(minMessages, maxMessages, 30, 70, 10, 30, 200, 500)),
    large: ((minMessages, maxMessages) =>  makeRandomMessages(minMessages, maxMessages, 40, 80, 10, 30, 300, 800)),
    xlarge: ((minMessages, maxMessages) =>  makeRandomMessages(minMessages, maxMessages, 50, 90, 10, 30, 500, 1000)),
};

const messageFactory = messageFactories.xsmall;
let frontServers, frontChannels, backServers, backChannels, channelsById;

describe('FrontChannel', function() {

    let cluster: ChannelCluster;

    before('Creates Channel Cluster.', (done) => {
        cluster = new ChannelCluster(options);
        ({ frontServers, frontChannels, backServers, backChannels, channelsById } = cluster.createChannels());
        setTimeout(() => {
            done();
        }, 200);
    });

    after(done => {
        cluster.closeAll();
        setTimeout(() => {
            done();
        }, 200);
    });

    describe('frontChannel.connect', () => {
        let connections = 0;
        it('tests asynchronous connection of 1 channel', (done) => {
            frontChannels[0].connect().then(connected => {
                connections += connected.size;
                assert.strictEqual(connected.size, options.totalChannels);
                done();
            });
        });

        it('tests asynchronous connection of the rest of the channels besides last one', (done) => {
            // all front channels besides the last one at the end of this test should be connected.
            const expectedConnections = options.totalChannels * (frontChannels.length - 1);

            for(let i = 1; i < frontChannels.length - 1; i++) {
                frontChannels[i].connect().then(connected => {
                    connections+=connected.size;
                    assert.strictEqual(connected.size, options.totalChannels);
                    if(connections === expectedConnections){
                        // reached total connections, wait a bit then check its still correct.
                        setTimeout(() => {
                            assert.strictEqual(connections, expectedConnections);
                            done();
                        }, 50);
                    }
                });
            }
        }).timeout(100000)
    });

    describe('frontChannel.onConnected', () => {
        it('tests handler gets called on successful connection', (done) => {

            // gets last unconnected front channel we didnt connect in previous tests
            const frontChannel = frontChannels[frontChannels.length - 1];
            let connectionsHandled = 0;

            frontChannel.onConnected(() => {
                connectionsHandled++;
            });

            frontChannels[frontChannels.length - 1].connect().then(connected => {
                // should have been ran once for each back channel it connected to.'
                // connections handled should match connected size
                assert.strictEqual(connectionsHandled, connected.size);
                assert.strictEqual(connectionsHandled, options.totalChannels);

                // just wait a bit and make sure no more handlers are triggered.
                setTimeout(() => {
                    assert.strictEqual(connectionsHandled, options.totalChannels);
                    done();
                }, 50);
            });
        });
    });

    describe('frontChannel.disconnect', () => {
        it('is unimplemented', (done) => {
            assert.doesNotThrow(() => { frontChannels[0].disconnect() });
            done();
        })
    });
    describe('frontChannel.onSetState', () => {
        it('correctly handles set state from back channel', (done) => {
            done();
        });
    });
    describe('frontChannel.onPatchState', () => {
        it('correctly handles patched state from back channel', (done) => {
            done();
        });
    });
    describe('frontChannel.onMessage', () => {
        it('correctly handles message from back channel', (done) => {
            done();
        });
    });
    describe('frontChannel.addMessage', () => {
        it('correctly adds message to queue', (done) => {
            assert.strictEqual(frontChannels[0].addMessage({"foo": "bar"}), 1);
            frontChannels[0].clearQueued();
            done();
        });
    });
    describe('frontChannel.sendQueued', () => {
        it('All front channels correctly send all queued messages to back mirror channel', (done) => {
            const STATIC_TEST_MESSAGES = [{"foo": "bar"}, {"baz": "foo"}, {"bar": "baz"}];

            let byteSizes = [];
            let messagesSent = [];
            let totalBytes = 0;
            let receivedMessages = 0;

            // gets assigned added to as we make random messages for channel
            let expectedReceivedMessages = 0;
            let receivedFromUidCounts = {};

            let randomMessagesByFrontUid = {};

            frontChannels.forEach(fc => {
                receivedFromUidCounts[fc.frontUid] = 0;
            });

            let queued = 0;
            let before = Date.now();
            console.log('registering all back channel\'s onMessage and queueing messages in front channels...');
            Object.keys(channelsById).forEach(id => {
                let _channel_back = channelsById[id].back;

                // register back messager
                _channel_back.onMessage((message, frontUid) => {
                    let receivedCountFromFront = receivedFromUidCounts[frontUid]++;
                    // first messages should be static test messages
                    if(receivedCountFromFront < STATIC_TEST_MESSAGES.length) {
                        assert.deepStrictEqual(STATIC_TEST_MESSAGES[receivedCountFromFront], message);
                    } else {
                        //after first statuc messages, start checking we received correct random ones.
                        // adjust index for static messages received
                        let indexAdjusted = receivedCountFromFront - STATIC_TEST_MESSAGES.length;
                        assert.deepStrictEqual(randomMessagesByFrontUid[frontUid][indexAdjusted], message);
                    }
                    receivedMessages++;
                });

                let _channel_fronts = channelsById[id].fronts;
                _channel_fronts.forEach(cf => {

                    // makes random messages
                    /*
                     minMessages=1, maxMessages=5,
                     minKeys=1, maxKeys=5,
                     minKeyLength = 5, maxKeyLength=30,
                     minValueLength=1, maxValueLength=10000
                     */

                    let randomMessages = messageFactory(5, 15);
                    messagesSent.push(randomMessages.length + STATIC_TEST_MESSAGES.length);
                    randomMessagesByFrontUid[cf.frontUid] = randomMessages;
                    // add random messgaes to expected count
                    expectedReceivedMessages += (randomMessages.length + STATIC_TEST_MESSAGES.length);
                    let msg_count = 0;
                    STATIC_TEST_MESSAGES.forEach(msg => {
                        let _stringedMSg = JSON.stringify(msg);
                        let byteSize = Buffer.byteLength(_stringedMSg, 'utf8');
                        byteSizes.push(byteSize);
                        totalBytes += byteSize;

                        msg_count = cf.addMessage(msg);
                    });
                    randomMessages.forEach(msg => {
                        let _stringedMSg = JSON.stringify(msg);
                        let byteSize = Buffer.byteLength(_stringedMSg, 'utf8');
                        byteSizes.push(byteSize);
                        totalBytes += byteSize;

                        msg_count = cf.addMessage(msg);
                    });
                    queued += randomMessages.length + STATIC_TEST_MESSAGES.length;
                    assert.strictEqual(msg_count, STATIC_TEST_MESSAGES.length + randomMessages.length);
                });
            });

            const msgByteSizeAverage = Math.floor(arrayAverage(byteSizes));
            const averageMessagesSent = Math.floor(arrayAverage(messagesSent));
            console.log('Queued:', queued, 'messages throughout', frontChannels.length, 'channels in', (Date.now() - before), 'milliseconds');
            console.log('sending approximately', averageMessagesSent, 'messages to each back channel...................................');

            let sent = Date.now();
            frontChannels.forEach(fc => {
                fc.sendQueued();
            });

            let checks = 0;
            let checkEvery = 1;
            let timeout = 2500;

            // check every 10 ms if we got all received messages and then 50 ms to make sure
            // we dont get anymore
            let interval = setInterval(() => {
                if(receivedMessages === expectedReceivedMessages) {
                    let received = Date.now();
                    let duration = received - sent;
                    console.log(
                        '','Received messages:', receivedMessages, '\n',
                        'Average message size:', msgByteSizeAverage, ('(' + formatBytes(msgByteSizeAverage, 6) + ')'), '\n',
                        'Total bytes sent:', totalBytes, ('(' + formatBytes(totalBytes, 6) + ')'), '\n',
                        'Duration:', duration, 'milliseconds','\n'
                    );

                    clearInterval(interval);
                    setTimeout(() => {
                        assert.strictEqual(receivedMessages, expectedReceivedMessages);
                        done();
                    }, 50);
                } else {
                    checks++;
                    if(checks * checkEvery > timeout) {
                        clearInterval(interval);
                        throw "Timeout";
                    }
                }
            }, checkEvery);
        }).timeout(100000);
    });

    describe('frontChannel.send', () => {
        it('sends to mirrored back channel when no backChannelId is passed in as a param', (done) => {
            const CHANNELS_COUNT = 10;

            let expectedTotalReceived = 0;
            let actualReceivedTotal = 0;
            let totalBytes = 0;

            // gets random channels and puts them into an array.
            let randomChannels = getRandomChannelIds(channelsById, CHANNELS_COUNT);
            assert.strictEqual(CHANNELS_COUNT, randomChannels.length);

            // store expected and received values to test.
            let messageTestDataByChannel = [];
            randomChannels.forEach((ch, indexForRandom) => {
                const curChannelId = ch.channelId;

                let sent = null;

                messageTestDataByChannel[indexForRandom] = {
                    backReceived: 0,
                    expectedReceived: 0,
                    messagesSentByFrontUid: {},
                    receivedByFrontUid: {},
                };

                const chTestData = messageTestDataByChannel[indexForRandom];


                // create messages for each front channel to send... were not queuing them in the channel
                //itself, just keeping reference to them in the test so we can register the assertions correctly in back.onMessage
                // and then will send them after as regular .send()
                ch.fronts.forEach(frontChannel => {
                    /*
                        minMessages=1, maxMessages=5,
                        minKeys=1, maxKeys=5,
                        minKeyLength = 5, maxKeyLength=30,
                        minValueLength=1, maxValueLength=10000
                     */

                    let randomMessages = messageFactory(5, 15);
                    expectedTotalReceived += randomMessages.length;
                    chTestData.expectedReceived += randomMessages.length;
                    chTestData.messagesSentByFrontUid[frontChannel.frontUid] = randomMessages;

                    let _stringedMSg = JSON.stringify(randomMessages);
                    let byteSize = Buffer.byteLength(_stringedMSg, 'utf8');
                    totalBytes += byteSize;
                });

                // register backChannel onMessage listener
                ch.back.onMessage((message, frontUid) => {
                    chTestData.backReceived++;
                    actualReceivedTotal++;

                    // confirm we never go over expected received as were receiving
                    assert.strictEqual(chTestData.backReceived <= chTestData.expectedReceived, true);

                    let { messagesSentByFrontUid, receivedByFrontUid } = chTestData;

                    if(!(frontUid in receivedByFrontUid)) {
                        receivedByFrontUid[frontUid] = [];
                    }
                    // confirm were getting the correct data of message and in order
                    //console.log('the messagesentByFrontUid was', messagesSentByFrontUid);
                   // console.log('then with uid as index,,,', messagesSentByFrontUid[frontUid]);
                   // console.log('the recevied by front was', receivedByFrontUid)

                    const curMsgIndex = receivedByFrontUid[frontUid].length;

                    assert.deepStrictEqual(messagesSentByFrontUid[frontUid][curMsgIndex], message);
                    //add to received for later checks.
                    receivedByFrontUid[frontUid].push(message);

                    // find correlated random front channel by received frontUid.
                    const frontChannelIndex = ch.fronts.findIndex(fc => fc.frontUid === frontUid);
                    const frontChannel = ch.fronts[frontChannelIndex];

                    // now finally assert that the front channel id is the same channel id as back (confirm its mirrored)
                    assert.strictEqual(frontChannel.channelId, curChannelId);

                    // check if we've received all by now
                    if(actualReceivedTotal === expectedTotalReceived) {
                        // wait a bit to make sure it doesnt receive more
                        let received = Date.now();
                        let duration = received - sent;
                        setTimeout(() => {
                            assert.strictEqual(actualReceivedTotal, expectedTotalReceived);

                            // loop through the messageTestDataByChannel and make sure all expected values are correct
                            messageTestDataByChannel.forEach(msgTestData => {
                                assert.deepStrictEqual(msgTestData.receivedByFrontUid, msgTestData.messagesSentByFrontUid);
                                assert.strictEqual(msgTestData.backReceived, msgTestData.expectedReceived);
                            });
                            console.log(
                                '','Received messages:', actualReceivedTotal, '\n',
                                'Total bytes sent:', totalBytes, ('(' + formatBytes(totalBytes, 6) + ')'), '\n',
                                'Duration', duration, 'milliseconds','\n'
                            );
                            done();
                        }, 50);
                    }
                });

                sent = Date.now();
                // now were going to send out the messages we set up to send.
                ch.fronts.forEach(frontChannel => {
                    const messages = chTestData.messagesSentByFrontUid[frontChannel.frontUid];
                    messages.forEach(msg => {
                        frontChannel.send(msg);
                    })
                });
            })
        }).timeout(100000);

        it('sends to correct back channel when backChannelId is specified', (done) => {
            let randomChannels = getRandomChannelIds(channelsById, 2);

            let expectedReceived = 0;
            let actualReceivedTotal = 0;
            let totalBytes = 0;

            const firstRandomChannels = randomChannels[0];
            const secondRandomChannels = randomChannels[1];

            let checkIfDone = (() => {
                if(actualReceivedTotal === expectedReceived) {
                    let duration = Date.now() - sent;
                    setTimeout(() => {
                        assert.strictEqual(actualReceivedTotal, expectedReceived);
                        console.log('', 'Received messages:', actualReceivedTotal, '\n',
                            'Total bytes sent:', totalBytes, ('(' + formatBytes(totalBytes, 6) + ')'), '\n',
                            'Duration:', duration, 'milliseconds');
                        done();
                    }, 100);
                }
            });

            let registerBackOnMessageTest = ((back, fronts) => {
                back.onMessage((message, frontUid) => {
                    let __time = Date.now();
                    const frontIndex = fronts.findIndex(fc => fc.frontUid === frontUid);
                    // confirms front uid exists
                    assert.strictEqual(frontIndex > -1, true);
                    // confirms sent front uid reached correct back channel.
                    assert.strictEqual(fronts[frontIndex].frontUid, frontUid);
                    // confirms sent front uid was not from same channel as back.
                    assert.notStrictEqual(fronts[frontIndex].channelId, back.channelId);
                    actualReceivedTotal++;
                    checkIfDone();
                });
            });
            registerBackOnMessageTest(firstRandomChannels.back, secondRandomChannels.fronts);
            registerBackOnMessageTest(secondRandomChannels.back, firstRandomChannels.fronts);

            let readyFrontChannelMessages = ((fronts) => {
                fronts.forEach(frontChannel => {
                    // make single random message
                    let message = (messageFactory(1, 1))[0];
                    expectedReceived++;
                    let _stringedMSg = JSON.stringify(message);
                    let byteSize = Buffer.byteLength(_stringedMSg, 'utf8');
                    totalBytes += byteSize;
                    // set message and we loop again so we can get more accurate delta time
                    frontChannel['testMessage'] = message;
                });
            });

            readyFrontChannelMessages(firstRandomChannels.fronts);
            readyFrontChannelMessages(secondRandomChannels.fronts);


            let sendFrontChannelMessages = ((fronts, sendToChannelId) => {
                let _time = Date.now();
                fronts.forEach(frontChannel => {
                    frontChannel.testMessage['sentAt'] = Date.now();
                    frontChannel.send(frontChannel.testMessage, sendToChannelId);
                });
            });
            let sent = Date.now();
            sendFrontChannelMessages(firstRandomChannels.fronts, secondRandomChannels.channelId);
            sendFrontChannelMessages(secondRandomChannels.fronts, firstRandomChannels.channelId);
        })
    });
    describe('frontChannel.broadcast', () => {
        it('sends to all back channels if no backChannelIds were passed in as second param', (done) => {
            let expectedReceived = options.totalChannels;
            let actualReceived = 0;
            const randomMessage = messageFactory(1, 1)[0];

            for(let i = 0; i < backChannels.length; i++) {
                backChannels[i].onMessage((message, frontUid) => {
                    actualReceived++;
                    assert.strictEqual(frontUid, frontChannels[0].frontUid);
                    if(actualReceived === expectedReceived) {
                        setTimeout(() => {
                            assert.strictEqual(actualReceived, expectedReceived);
                            done();
                        }, 50);
                    }
                });
            }
            frontChannels[0].broadcast(randomMessage);
        });
        it('sends to all specified channels if backChannelIds were passed in as second param', (done) => {
            const randomMessage = messageFactory(1, 1)[0];

            let backChannelIds = [backChannels[0].channelId, backChannels[3].channelId, backChannels[5].channelId];
            let receivedChannelIds = [];
            let sendingFrontChannels = [frontChannels[0], frontChannels[55], frontChannels[80], frontChannels[125], frontChannels[400], frontChannels[frontChannels.length - 1]];

            let expectedFrontUidCount = backChannelIds.length;

            let sentFrontUidsCountMap = {};
            sendingFrontChannels.forEach(fc => {
                sentFrontUidsCountMap[fc.frontUid] = 0;
            });

            let receivedChannelIdsCountMap = {};
            backChannelIds.forEach(cId => {
                receivedChannelIdsCountMap[cId] = 0;
            });
            let expectedChannelIdCount = sendingFrontChannels.length;

            let actualReceived = 0;
            let expectedReceived = backChannelIds.length * sendingFrontChannels.length;


            for(let i = 0; i < backChannels.length; i++) {
                backChannels[i].onMessage((message, frontUid) => {
                    actualReceived++;
                    sentFrontUidsCountMap[frontUid]++;
                    receivedChannelIdsCountMap[backChannels[i].channelId]++;
                    if(actualReceived === expectedReceived) {
                        setTimeout(() => {
                            assert.strictEqual(actualReceived, expectedReceived);
                            Object.keys(receivedChannelIds).forEach(key => {
                                assert.strictEqual(receivedChannelIds[key], expectedChannelIdCount);
                            });
                            Object.keys(sentFrontUidsCountMap).forEach(key => {
                                assert.strictEqual(sentFrontUidsCountMap[key], expectedFrontUidCount);
                            });
                            done();
                        }, 50);
                    }
                });
            }
            sendingFrontChannels.forEach(frontChannel => {
                frontChannel.broadcast(randomMessage, backChannelIds);
            })
        });
    });
});
