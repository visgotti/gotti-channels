import { FrontChannel } from '../src/core/FrontChannel';
import { BackChannel } from '../src/core/BackChannel';

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
                frontChannels.push(new FrontChannel(i, frontServer));
            }

            // split channels evenly amongst back servers
            let backServer = (i < totalChannels/2) ? backServers[0] : backServers[1];
            backChannels.push(new BackChannel(i, backServer));
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
        frontChannels.length = 0;
        backChannels.length = 0;
        setTimeout(() => {
            done();
        }, 1000);
    });

    it('tests integration of frontChannel.onBackStateUpdate, backChannel.setState, and backChannel.broadcastState', function(done) {
        done();
    });

});