'use strict';
const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('power-assert');

const { mockAws } = require('../../lib/mockUtility');

const errorsPostHandler = require('./../errorsPost.js').handlerBuilder(mockAws);
const handler = require('./../encrypt.js').handlerBuilder(mockAws);

describe('encrypt.handler', () => {
    beforeEach(() => {
        return mockAws.createResources();
    });

    afterEach(() => {
        return mockAws.deleteResources();
    });

    it ('When invalid X-Api-Key, response should be 403 error', () => {
        const event = {
            httpMethod: 'GET',
            headers: {
                'X-Api-Key': 'Invalid'
            },
            body: JSON.stringify({
                "type": "slack",
                "endpoint": "https://hooks.slack.com/services/XXXXXXXX/XXXXXXXX/XXXxxXXXXXXxxxxXXXXXXX",
                "channel": "#faultline",
                "username": "faultline-notify",
                "notifyInterval": 5,
                "threshold": 10,
                "timezone": "Asia/Tokyo",
                "linkTemplate": "https://faultline.example.com/v0/index.html#/projects/{project}/errors/{message}/occurrences/{reversedUnixtime}"
            })
        };
        const context = {};

        return new Promise((resolve) => {
            const cb = (error, response) => {
                assert(error === null);
                assert(response.statusCode === 403);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
                resolve();
            };
            handler(event, context, cb);
        });
    });

    it ('When process.env.FAULTLINE_USE_KMS=0, response should be 412 error', () => {
        process.env.FAULTLINE_USE_KMS = 0;
        const event = {
            httpMethod: 'GET',
            headers: {
                'X-Api-Key': process.env.FAULTLINE_MASTER_API_KEY
            },
            body: JSON.stringify({
                "type": "slack",
                "endpoint": "https://hooks.slack.com/services/XXXXXXXX/XXXXXXXX/XXXxxXXXXXXxxxxXXXXXXX",
                "channel": "#faultline",
                "username": "faultline-notify",
                "notifyInterval": 5,
                "threshold": 10,
                "timezone": "Asia/Tokyo",
                "linkTemplate": "https://faultline.example.com/v0/index.html#/projects/{project}/errors/{message}/occurrences/{reversedUnixtime}"
            })
        };
        const context = {};

        return new Promise((resolve) => {
            const cb = (error, response) => {
                assert(error === null);
                assert(response.statusCode === 412);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
                resolve();
            };
            handler(event, context, cb);
        });
    });

    it ('When process.env.FAULTLINE_KMS_KEY_ALIAS=\'\', response should be 412 error', () => {
        process.env.FAULTLINE_USE_KMS = '1';
        process.env.FAULTLINE_KMS_KEY_ALIAS = '';
        const event = {
            httpMethod: 'GET',
            headers: {
                'X-Api-Key': process.env.FAULTLINE_MASTER_API_KEY
            },
            body: JSON.stringify({
                "type": "slack",
                "endpoint": "https://hooks.slack.com/services/XXXXXXXX/XXXXXXXX/XXXxxXXXXXXxxxxXXXXXXX",
                "channel": "#faultline",
                "username": "faultline-notify",
                "notifyInterval": 5,
                "threshold": 10,
                "timezone": "Asia/Tokyo",
                "linkTemplate": "https://faultline.example.com/v0/index.html#/projects/{project}/errors/{message}/occurrences/{reversedUnixtime}"
            })
        };
        const context = {};

        return new Promise((resolve) => {
            const cb = (error, response) => {
                assert(error === null);
                assert(response.statusCode === 412);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
                resolve();
            };
            handler(event, context, cb);
        });
    });
});
