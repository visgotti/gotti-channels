import {clearInterval} from "timers";
import * as msgpack from 'notepack.io';

import { Master} from '../src/core/Master';

import * as assert from 'assert';
import * as mocha from 'mocha';

const MASTER_URI = 'tcp://127.0.0.1:3000';
const TEST_FRONT_URIS = ['tcp://127.0.0.1:4000', 'tcp://127.0.0.1:4001', 'tcp://127.0.0.1:4002'];
const TEST_BACK_URIS = ['tcp://127.0.0.1:5000','tcp://127.0.0.1:5001','tcp://127.0.0.1:5002','tcp://127.0.0.1:5003'];

describe.only('Master', function() {

    let master;
    beforeEach('Creates master instance.', (done) => {
        master = new Master(MASTER_URI, TEST_BACK_URIS, TEST_FRONT_URIS);
        done();
    });
    describe('master.getMasters', () => {
        it('throws an error if we dont have enough Back URIS available', (done) => {
            try {
                master.getMasters({
                    backRequests: [{
                        backMastersNeeded: 2,
                        channelsPerMaster: 2,
                        type: 'foo'
                    }, {
                        backMastersNeeded: 3,
                        channelsPerMaster: 2,
                        type: 'bar'
                    }],
                    frontRequest: {
                        frontMastersNeeded: 3
                    }
                })
            } catch (err) {
                assert.strictEqual(err.message, 'Not enough back uris are available.');
                done()
            }
        });

        it('throws an error if we dont have enough front URIS available', (done) => {
            try {
                master.getMasters({
                    backRequests: [{
                        backMastersNeeded: 2,
                        channelsPerMaster: 2,
                        type: 'foo'
                    }, {
                        backMastersNeeded: 2,
                        channelsPerMaster: 2,
                        type: 'bar'
                    }],
                    frontRequest: {
                        frontMastersNeeded: 4
                    }
                })
            } catch (err) {
                assert.strictEqual(err.message, 'Not enough front uris are available.');
                done()
            }
        });

        it('returns back uris by type and an array of front uids if succesful', (done) => {
            const expectedBackUrisByType =  {
                'foo': TEST_BACK_URIS.slice(0, 2),
                'bar': TEST_BACK_URIS.slice(2, 4)
            };

            const { frontURIs, backURIsByType } = master.getMasters({
                backRequests: [{
                    backMastersNeeded: 2,
                    channelsPerMaster: 2,
                    type: 'foo'
                }, {
                    backMastersNeeded: 2,
                    channelsPerMaster: 2,
                    type: 'bar'
                }],
                frontRequest: {
                    frontMastersNeeded: 3
                }
            });

            assert.deepStrictEqual(frontURIs, TEST_FRONT_URIS);
            assert.deepStrictEqual(backURIsByType, expectedBackUrisByType);
            done();
        });
    });
});
