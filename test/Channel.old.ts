import { FrontChannel } from '../src/core/FrontChannel';
import { BackChannel } from '../src/core/BackChannel/BackChannel';

const { Centrum } = require('../lib/Centrum.js');

import * as assert from 'assert';
import * as mocha from 'mocha'
import * as fs from 'fs';
import * as path from 'path';

describe('Channel', function() {
    let config: any;
    let backServers = [];
    let frontServers = [];

    const totalChannels = 10;

    let backChannels = [];
    let frontChannels = [];

    before('Initialize centrum instances and channels', (done) => {
        config = fs.readFileSync(path.resolve('test', 'centrum.config.json'));
        config = JSON.parse(config);

        for(let i = 0; i < config.servers.length; i++) {
            const serverData = config.servers[i];

            let server = new Centrum(serverData.centrumOptions);

            if(serverData.centrumOptions.type === "back") {
                backServers.push(server);
            } else if (serverData.centrumOptions["subscribe"]) {
                frontServers.push(server);
            }
        }

        // have back servers each handle 5 channels
        for(let i = 0; i < totalChannels; i++) {

            // each front server needs all channels
            for(let j = 0; j < frontServers.length; j++) {
                let frontServer = frontServers[j];
                frontChannels.push(new FrontChannel(i, j, frontServer));
            }

            // split channels evenly amongst back servers
            let backServer = (i < totalChannels/2) ? backServers[0] : backServers[1];
            backChannels.push(new BackChannel(i, backServer));
        }

        setTimeout(() => {
            assert.strictEqual(frontChannels.length, 20);
            assert.strictEqual(backChannels.length, 10);

            for(let i = 0; i < frontChannels.length; i++) {
                frontChannels[i].connect();
            }
            setTimeout(() => {
                for(let i = 0; i < backChannels.length; i++) {
                    // makes sure all the backChannels have a reference to all the frontChannels.
                    assert.strictEqual(backChannels[i].getConnectedFrontIds().length, 20);
                }
                done();
            }, 200);
        }, 200);
    });

    after((done) => {
        for(let i = 0; i < frontChannels.length; i++) {
            frontChannels[i].close();
        }
        for(let i = 0; i < backChannels.length; i++) {
            backChannels[i].close();
        }
        frontChannels.length = 0;
        backChannels.length = 0;
        setTimeout(() => {
            done();
        }, 1000);
    });

    it('frontChannel.forwardMessages triggers backChannel onMessage', function(done) {
        const sent = {
            type: 'foo',
            data: 1,
        };

        frontChannels[0].addMessage(sent);
        frontChannels[0].forwardMessages();

        backChannels[0].onMessage(received => {
            assert.deepStrictEqual(sent, received);
            done();
        });
    });

    it('frontChannel.forwardMessages clears queued messages and wont send anything unless you add more messages', function(done) {
        let messagesReceived = 0;
        const sent = {
            type: 'foo',
            data: 1,
        };

        frontChannels[0].addMessage(sent);
        frontChannels[0].forwardMessages();

        // should not forward anything
        frontChannels[0].forwardMessages();

        backChannels[0].onMessage(received => {
            messagesReceived++;
        });

        setTimeout(() => {
            assert.strictEqual(messagesReceived, 1);
            done();
        }, 100);
    });

    it('frontChannel.forwardMessages sends multiple messages and backChannel.onMessage handles them.', function(done) {
        let messagesReceived = 0;

        const sent = {
            'foo': {
                id: 'foo',
            },
            'bar': {
                id: 'bar',
            }
        };

        const received = {};

        frontChannels[0].addMessage(sent.foo);
        frontChannels[0].addMessage(sent.bar);
        // should not forward anything
        frontChannels[0].forwardMessages();

        backChannels[0].onMessage(message => {
            received[message.id] = message;
            messagesReceived++;
        });

        setTimeout(() => {
            assert.deepStrictEqual(sent, received);
            assert.deepStrictEqual(messagesReceived, 2);
            done();
        }, 100);
    });

    it('Back channel receives messages from both sibiling front channels', function(done) {
        const sent = {
            'foo': {
                id: 'foo',
            },
            'bar': {
                id: 'bar',
            }
        };

        const received = {};


        frontChannels[0].addMessage(sent.foo);
        frontChannels[0].forwardMessages();

        frontChannels[1].addMessage(sent.bar);
        // should not forward anything
        frontChannels[1].forwardMessages();

        backChannels[0].onMessage(message => {
            received[message.id] = message;
        });

        setTimeout(() => {
            assert.deepStrictEqual(sent, received);
            done();
        }, 100);
    });

    it('frontChannel.broadcastToAllBackChannels sends message to all back channels', function(done) {
        let messagesReceived = 0;

        let backsReceived = new Set();

        const mockMessage = {
            data: "hello",
        };

        frontChannels[0].broadcastToAllBackChannels(mockMessage);

        for(let i = 0; i < backChannels.length; i++) {
            backChannels[i].onMessage((message, fromId) => {
                messagesReceived++;
                // assert the back server hasnt received yet
                assert.strictEqual(backsReceived.has(backChannels[i].id), false);
                backsReceived.add(backChannels[i].id);
                assert.strictEqual(fromId, frontChannels[0].frontId);
            });
        }
        setTimeout(() => {
            assert.strictEqual(messagesReceived, backChannels.length);
            done();
        }, 100);
    });

    it('backChannel.sendMessage without a specified frontChannelId will send to only sibling front channels.', function(done) {
        let messagesReceived = 0;
        let correctDataMessagesReceived = 0;
        backChannels[0].sendMessage("hi");

        // register message from all front channels but only two of them should get it.
        for(let i = 0; i < frontChannels.length; i++){
            frontChannels[i].onMessage(message => {
                messagesReceived++;
                if(message === "hi") {
                    correctDataMessagesReceived++;
                }
            })
        }

        setTimeout(() => {
            assert.strictEqual(messagesReceived, 2);
            assert.strictEqual(correctDataMessagesReceived, 2);
            done();
        }, 100);
    });

    it('backChannel.sendMessage with a specified frontChannelId will only send to that channel', function(done) {
        let messagesReceived = 0;
        let correctDataMessagesReceive = 0;

        backChannels[0].sendMessage("foo", '3-1');
        backChannels[0].sendMessage("bar", '9-1');
        backChannels[0].sendMessage("baz", '1-0');

        // register message from all front channels but only two of them should get it.
        for(let i = 0; i < frontChannels.length; i++){
            frontChannels[i].onMessage(message => {
                messagesReceived++;
                if(frontChannels[i].frontId === '3-1') {
                    if(message === 'foo') {
                        correctDataMessagesReceive++
                    }
                }
                if(frontChannels[i].frontId === '9-1') {
                    if(message === 'bar') {
                        correctDataMessagesReceive++
                    }
                }
                if(frontChannels[i].frontId === '1-0') {
                    if(message === 'baz') {
                        correctDataMessagesReceive++
                    }
                }
            })
        }

        setTimeout(() => {
            assert.strictEqual(messagesReceived, 3);
            assert.strictEqual(correctDataMessagesReceive, 3);
            done();
        }, 100);
    })
});