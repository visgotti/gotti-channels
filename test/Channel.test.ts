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
        let broadcastsProcessed = 0;

        frontChannels.forEach(frontChannel => {
            frontChannel.onBackStateUpdate((state) => {
                broadcastsProcessed+=state;
            });
        });

        backChannels.forEach(backChannel => {
            backChannel.setState(1);
            backChannel.broadcastState();
        });

        setTimeout(() => {
            assert.strictEqual(broadcastsProcessed, 20);
            done();
        }, 300);

    });

    it('tests integration of backChannel.onFrontStateUpdate, frontChannel.setState, and frontChannel.broadcastState', function(done) {
        let broadcastsProcessed = 0;

        frontChannels.forEach(frontChannel => {
            frontChannel.setState(1);
            frontChannel.broadcastState();
        });

        backChannels.forEach(backChannel => {
            backChannel.onFrontStateUpdate((state) => {
                broadcastsProcessed+=state;
            });
        });

        setTimeout(() => {
            assert.strictEqual(broadcastsProcessed, 20);
            done();
        }, 300);

    });

    it('tests updateState and updateState from front to back', function(done) {
        let broadcastsProcessed = 0;

        frontChannels.forEach(frontChannel => {
            frontChannel.setState({});
            frontChannel.updateState(1, 'increment');
            frontChannel.broadcastState();
        });

        backChannels.forEach(backChannel => {
            backChannel.setState({});

            backChannel.onFrontStateUpdate((state) => {
                backChannel.updateState(state);
                broadcastsProcessed+=state.increment;
            });
        });

        setTimeout(() => {
            assert.strictEqual(broadcastsProcessed, 20);
            done();
        }, 300);
    });


    it('tests updateState and updateState from back to front', function(done) {
        let broadcastsProcessed = 0;

        frontChannels.forEach(frontChannel => {
            frontChannel.onBackStateUpdate((state) => {
                broadcastsProcessed+=state.increment;
            });
        });

        backChannels.forEach(backChannel => {
            backChannel.setState({});
            backChannel.updateState(1, 'increment');
            backChannel.broadcastState();
        });

        setTimeout(() => {
            assert.strictEqual(broadcastsProcessed, 20);
            done();
        }, 300);
    });

    it('tests frontChannel.removeState removes state and automatically removes it from backChannel as well', function(done) {
        let broadcastsProcessed = 0;
        let removedIncrementsProcessed = 0;

        frontChannels.forEach(frontChannel => {
            frontChannel.setState({});
            frontChannel.updateState(1, 'increment');
            frontChannel.broadcastState();
        });

        // a little later delete half of the front states
        // so the backChannel should wind up only receiving 30
        // incrementations
        let i = 0;
        frontChannels.forEach(frontChannel => {
            if(i < 10) {
                frontChannel.removeState('increment');
            } else {
            }
            frontChannel.broadcastState();
            i++;
        });

        backChannels.forEach(backChannel => {
            backChannel.onFrontStateUpdate((state) => {
                backChannel.setState(state);
                const backStateData = backChannel.getStateData();
                if(backStateData.increment) {
                    broadcastsProcessed+=backStateData.increment
                } else {
                    // backstate data should have removed increment since the front server did
                    removedIncrementsProcessed++;
                    assert.deepStrictEqual(backStateData, {});
                }
            });
        });

        setTimeout(() => {
            assert.strictEqual(broadcastsProcessed, 30);
            assert.strictEqual(removedIncrementsProcessed, 10);
            done();
        }, 300);
    });
});