'use strict';
const describe = require('mocha').describe;
const it = require('mocha').it;
const beforeEach = require('mocha').beforeEach;
const assert = require('power-assert');
const checkApiKey = require('../../src/lib/check_api_key');

describe('checkApiKey', () => {
    let event = {};
    let config = {};
    beforeEach((done) => {
        event = {
            headers: {
            }
        };
        config.apiKey = 'API_KEY';
        config.clientApiKey = 'CLIENT_API_KEY';
        done();
    });

    it ('headers has no `x-api-key`, should be false', () => {
        assert(checkApiKey(event, config) === false);
    });

    it ('headers has `x-api-key` and value = config.apiKey, should be true', () => {
        event['headers']['x-api-key'] = 'API_KEY';
        assert(checkApiKey(event, config) === true);
    });

    it ('headers has `X-Api-Key` and value = config.apiKey, should be true', () => {
        event['headers']['X-Api-Key'] = 'API_KEY';
        assert(checkApiKey(event, config) === true);
    });

    it ('headers has `x-api-key` but value != config.apiKey, should be false', () => {
        event['headers']['x-api-key'] = 'INVALID_API_KEY';
        assert(checkApiKey(event, config) === false);
    });

    it ('allowClientKey = true, checkApiKey check config.apiKey and config.clientApiKey', () => {
        event['headers']['x-api-key'] = 'API_KEY';
        assert(checkApiKey(event, config, true) === true);
        event['headers']['x-api-key'] = 'CLIENT_API_KEY';
        assert(checkApiKey(event, config, true) === true);
    });

    it ('!config.apiKey and !config.clientApiKey, checkApiKey does not check', () => {
        config = {};
        assert(checkApiKey(event, config) === true);
    });

    it ('config.clientApiKey and allowClientKey = false, checkApiKey check', () => {
        config = {};
        config.clientApiKey = 'CLIENT_API_KEY';
        assert(checkApiKey(event, config) === false);
    });

    it ('config.clientApiKey and allowClientKey = true, checkApiKey check', () => {
        config = {};
        config.clientApiKey = 'CLIENT_API_KEY';
        assert(checkApiKey(event, config, true) === false);
    });
});
