'use strict';
const describe = require('mocha').describe;
const it = require('mocha').it;
const beforeEach = require('mocha').beforeEach;
const assert = require('power-assert');
const checkApiKeyMiddleware = require('../checkApiKeyMiddleware');

describe('checkApiKeyMiddleware.checkApiKey', () => {
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

    it ('headers has no `x-api-key`, should be false', () => {
        assert(checkApiKeyMiddleware().checkApiKey(event) === false);
    });

    it ('headers has `x-api-key` and value = process.env.FAULTLINE_MASTER_API_KEY, should be true', () => {
        event['headers']['x-api-key'] = 'MASTER_API_KEY';
        assert(checkApiKeyMiddleware().checkApiKey(event) === true);
    });

    it ('headers has `X-Api-Key` and value = process.env.FAULTLINE_MASTER_API_KEY, should be true', () => {
        event['headers']['X-Api-Key'] = 'MASTER_API_KEY';
        assert(checkApiKeyMiddleware().checkApiKey(event) === true);
    });

    it ('headers has `x-api-key` but value != process.env.FAULTLINE_MASTER_API_KEY, should be false', () => {
        event['headers']['x-api-key'] = 'INVALID_API_KEY';
        assert(checkApiKeyMiddleware().checkApiKey(event) === false);
    });

    it ('allowClientKey = true, checkApiKeyMiddleware().checkApiKey check process.env.FAULTLINE_MASTER_API_KEY and process.env.FAULTLINE_CLIENT_API_KEY', () => {
        event['headers']['x-api-key'] = 'MASTER_API_KEY';
        assert(checkApiKeyMiddleware({ allowClientKey: true }).checkApiKey(event) === true);
        event['headers']['x-api-key'] = 'CLIENT_API_KEY';
        assert(checkApiKeyMiddleware({ allowClientKey: true }).checkApiKey(event) === true);
    });

    it ('!process.env.FAULTLINE_MASTER_API_KEY and !process.env.FAULTLINE_CLIENT_API_KEY, checkApiKeyMiddleware().checkApiKey does not check', () => {
        delete process.env.FAULTLINE_MASTER_API_KEY;
        delete process.env.FAULTLINE_CLIENT_API_KEY;
        assert(checkApiKeyMiddleware().checkApiKey(event) === true);
    });

    it ('process.env.FAULTLINE_CLIENT_API_KEY and allowClientKey = false, checkApiKeyMiddleware().checkApiKey check', () => {
        delete process.env.FAULTLINE_MASTER_API_KEY;
        assert(checkApiKeyMiddleware().checkApiKey(event) === false);
    });

    it ('process.env.FAULTLINE_CLIENT_API_KEY and allowClientKey = true, checkApiKeyMiddleware().checkApiKey check', () => {
        delete process.env.FAULTLINE_MASTER_API_KEY;
        assert(checkApiKeyMiddleware({ allowClientKey: true }).checkApiKey(event) === false);
    });
});
