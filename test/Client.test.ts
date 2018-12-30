import { FrontChannel } from '../src/core/FrontChannel';
import { BackChannel } from '../src/core/BackChannel';
import { Client } from '../src/core/Client/Client';

const { Centrum } = require('../lib/Centrum.js');

import * as assert from 'assert';
import * as mocha from 'mocha'
import * as fs from 'fs';
import * as path from 'path';

describe('Client', function() {
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
                frontChannels.push(new FrontChannel(i, frontServer));
            }

            // split channels evenly amongst back servers
            let backServer = (i < totalChannels/2) ? backServers[0] : backServers[1];
            backChannels.push(new BackChannel(i, backServer));


            // register backChannel front state update handler
            backChannels[i].onFrontStateUpdate((state => {
                // in this case the keys for received state are UIDs, that mock data of player input.
                Object.keys(state).forEach(uid => {
                    const frontClientState = state[uid];
                    if(frontClientState.pressingDown) {
                        backChannels[i].updateState('down', uid);
                    }
                    if(frontClientState.pressingUp) {
                        backChannels[i].updateState('up', uid);
                    }
                });
                // broadcast state back after processing.
                backChannels[i].broadcastState();
            }));
        }

        setTimeout(() => {
            assert.strictEqual(frontChannels.length, 20);
            assert.strictEqual(backChannels.length, 10);
            done();
        }, 200);
    });

    after((done) => {
        for(let i = 0; i < frontChannels.length; i++) {
            frontChannels[i].close();
        }
        for(let i = 0; i < backChannels.length; i++) {
            backChannels[i].close();
        }
        setTimeout(() => {
            done();
        }, 100);
    });

    describe('Client.connectChannel', function() {
        let client_foo: Client;
        let client_bar: Client;
        before('Initialize two clients into different channels', (done) => {
            client_foo = new Client('foo');
            client_foo.connectChannel(frontChannels[0]);

            client_bar = new Client('bar');
            // index 2 because index 1 is the same channel id as index 0.. going to think about
            // how to make this less confusing.. may have connectChannel take an ID instead
            // but then I need a lookup somewhere and i want to try and keep everything
            // decouples as possible so not sure.
            client_bar.connectChannel(frontChannels[2]);
            done();
        });
        it('Client.setState sets clients state also sets the home frontChannels state', (done) => {
            // going to mock like the state is input that we want the back servers to process
            client_foo.setState({"pressingUp": true });
            assert.deepStrictEqual(client_foo.getState(), { "pressingUp": true });
            assert.deepStrictEqual(frontChannels[0].getState(), { "data": { "foo":{"pressingUp": true }}});

            client_bar.setState({"pressingDown": true });
            assert.deepStrictEqual(client_bar.getState(), { "pressingDown": true });
            assert.deepStrictEqual(frontChannels[2].getState(),  { "data": { "bar":{"pressingDown": true }}});
            done();
        });
        it('Client.getLinkedStates includes only state from its connected channel' , (done) => {
            const fooLinkedStates = client_foo.getLinkedStates();
            const barLinkedStates = client_bar.getLinkedStates();
            assert.strictEqual(fooLinkedStates.hasOwnProperty("0"), true);
            assert.strictEqual(fooLinkedStates.hasOwnProperty("1"), false);
            assert.strictEqual(barLinkedStates.hasOwnProperty("1"), true);
            assert.strictEqual(barLinkedStates.hasOwnProperty("0"), false);
            done();
        });
        it('Client.getLinkedStates channel states are empty since nothing has been broadcasted for the back channel to update state' , (done) => {
            const fooLinkedStates = client_foo.getLinkedStates();
            const barLinkedStates = client_bar.getLinkedStates();
            assert.deepStrictEqual(fooLinkedStates["0"], { "data": {}});
            assert.deepStrictEqual(barLinkedStates["1"], { "data": {}});
            done();
        });
        it('Client.getLinkedStates channel states have processed back states after front channels broadcasted their front states' , (done) => {
            // broadcast front server states then wait 200 ms to check if back server processed it correctly
            frontChannels[0].broadcastState();
            frontChannels[2].broadcastState();
            setTimeout(() => {
                const fooLinkedStates = client_foo.getLinkedStates();
                // sent pressingUp, back should have set state to up
                assert.deepStrictEqual(fooLinkedStates, {
                    '0': {'data': { 'foo': 'up'} }
                });

                const barLinkedStates = client_bar.getLinkedStates();
                // sent pressingDown, back should have set state to down
                assert.deepStrictEqual(barLinkedStates, {
                    '1': {'data': { 'bar': 'down'} }
                });
                done();
            }, 200);
        });

        it('Linking client_foo to client_bars\'s connected channel gives client_foo client_bar\'s back state but not vice versa' , (done) => {
            // broadcast front server states then wait 200 ms to check if back server processed it correctly
            client_foo.linkChannel(frontChannels[2]);
            frontChannels[0].broadcastState();
            frontChannels[2].broadcastState();
            setTimeout(() => {
                const fooLinkedStates = client_foo.getLinkedStates();
                // should have linked states from channel 1 which includes client_bars state
                assert.deepStrictEqual(fooLinkedStates, {
                  '0': {'data': { 'foo': 'up'} },
                  '1': {'data': { 'bar': 'down'} }
                });

                // bar linked states should be same as last
                const barLinkedStates = client_bar.getLinkedStates();
                assert.deepStrictEqual(barLinkedStates, {
                    '1': {'data': { 'bar': 'down'} }
                });

                done();
            }, 200);
        });

        it('Unlinking client_foo from client_bars connected server removes the state of client_bar' , (done) => {
            // broadcast front server states then wait 200 ms to check if back server processed it correctly
            client_foo.unlinkChannel(frontChannels[2].id);
            frontChannels[0].broadcastState();
            frontChannels[2].broadcastState();
            setTimeout(() => {
                const fooLinkedStates = client_foo.getLinkedStates();
                // should have just its own state
                assert.deepStrictEqual(fooLinkedStates, {
                    '0': {'data': { 'foo': 'up'} },
                });

                // bar linked states should be same as last
                const barLinkedStates = client_bar.getLinkedStates();
                assert.deepStrictEqual(barLinkedStates, {
                    '1': {'data': { 'bar': 'down'} }
                });
                done();
            }, 200);
        });

        describe('client_foo.connectChannel', () => {
            before((done) => {
                client_foo.connectChannel(frontChannels[2]);
                setTimeout(() => {
                    done();
                }, 200)
            });
            it('removes state from old connectedChannel', (done) => {
                assert.deepStrictEqual(frontChannels[0].getState(), { "data": {} });
                done();
            });
            it('updates linked states for both client_foo and client_bar after new broadcasts', (done) => {
                frontChannels[0].broadcastState();
                frontChannels[2].broadcastState();
                setTimeout(() => {
                    const fooLinkedStates = client_foo.getLinkedStates();
                    // both states should live in channelId of 1 and both should be receiving the backState data

                    // foo changed connected channel but never unlinked so should still actually
                    // receive an empty state from channel 0
                    assert.deepStrictEqual(fooLinkedStates, {
                        '0': {'data': {} },
                        '1': {'data': { 'foo': 'up', 'bar': 'down'} },
                    });

                    const barLinkedStates = client_bar.getLinkedStates();
                    assert.deepStrictEqual(barLinkedStates, {
                        '1': {'data': { 'foo': 'up', 'bar': 'down'} },
                    });

                    done();
                }, 200);
            });
        });
    });
});