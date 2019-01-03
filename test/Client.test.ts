import { FrontChannel } from '../src/core/FrontChannel';
import { BackChannel } from '../src/core/BackChannel';
import { Client } from '../src/core/Client';

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
                frontChannels.push(new FrontChannel(i, j, frontServer));
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
    });
});