'use strict';
const describe = require('mocha').describe;
const it = require('mocha').it;
const beforeEach = require('mocha').beforeEach;
const assert = require('power-assert');
const { checkApiKey } = require('../../middlewares');

describe('checkApiKey', () => {
    let event = {};
    beforeEach((done) => {
        event = {
            headers: {
            }
        };
        process.env.FAULTLINE_MASTER_API_KEY = 'MASTER_API_KEY';
        process.env.FAULTLINE_CLIENT_API_KEY = 'CLIENT_API_KEY';
        done();
    });

    it ('headers has no `X-Api-Key`, should be false', () => {
        assert(checkApiKey().checkApiKey(event) === false);
    });

    it ('headers has `X-Api-Key` and value = process.env.FAULTLINE_MASTER_API_KEY, should be true', () => {
        event['headers']['X-Api-Key'] = 'MASTER_API_KEY';
        assert(checkApiKey().checkApiKey(event) === true);
    });

    it ('headers has `X-Api-Key` and value = process.env.FAULTLINE_MASTER_API_KEY, should be true', () => {
        event['headers']['X-Api-Key'] = 'MASTER_API_KEY';
        assert(checkApiKey().checkApiKey(event) === true);
    });

    it ('headers has `X-Api-Key` but value != process.env.FAULTLINE_MASTER_API_KEY, should be false', () => {
        event['headers']['X-Api-Key'] = 'INVALID_API_KEY';
        assert(checkApiKey().checkApiKey(event) === false);
    });

    it ('allowClientKey = true, checkApiKey().checkApiKey check process.env.FAULTLINE_MASTER_API_KEY and process.env.FAULTLINE_CLIENT_API_KEY', () => {
        event['headers']['X-Api-Key'] = 'MASTER_API_KEY';
        assert(checkApiKey({ allowClientKey: true }).checkApiKey(event) === true);
        event['headers']['X-Api-Key'] = 'CLIENT_API_KEY';
        assert(checkApiKey({ allowClientKey: true }).checkApiKey(event) === true);
    });

    it ('!process.env.FAULTLINE_MASTER_API_KEY and !process.env.FAULTLINE_CLIENT_API_KEY, checkApiKey().checkApiKey does not check', () => {
        delete process.env.FAULTLINE_MASTER_API_KEY;
        delete process.env.FAULTLINE_CLIENT_API_KEY;
        assert(checkApiKey().checkApiKey(event) === true);
    });

    it ('process.env.FAULTLINE_CLIENT_API_KEY and allowClientKey = false, checkApiKey().checkApiKey check', () => {
        delete process.env.FAULTLINE_MASTER_API_KEY;
        assert(checkApiKey().checkApiKey(event) === false);
    });

    it ('process.env.FAULTLINE_CLIENT_API_KEY and allowClientKey = true, checkApiKey().checkApiKey check', () => {
        delete process.env.FAULTLINE_MASTER_API_KEY;
        assert(checkApiKey({ allowClientKey: true }).checkApiKey(event) === false);
    });

    it ('if process.env.FAULTLINE_CLIENT_API_KEY contains a comma, checkApiKey assumes it is multiple keys and checks', () => {
        process.env.FAULTLINE_CLIENT_API_KEY = 'CLIENT_API_KEY, OTHER_CLIENT_API_KEY';
        event['headers']['X-Api-Key'] = 'CLIENT_API_KEY';
        assert(checkApiKey({ allowClientKey: true }).checkApiKey(event) === true);
        event['headers']['X-Api-Key'] = 'OTHER_CLIENT_API_KEY';
        assert(checkApiKey({ allowClientKey: true }).checkApiKey(event) === true);
    });
});
