'use strict';
const describe = require('mocha').describe;
const it = require('mocha').it;
const assert = require('power-assert');
const middy = require('middy');
const bodyStringifier = require('../bodyStringifier');

describe('bodyStringify', () => {
    it ('When handler.response.body is object, response.body is stringified.', () => {
        const beforeResponse = {
            body: {
                foo: 'bar'
            }
        };

        const handler = middy((event, context, cb) => {
            cb(null, beforeResponse);
        });

        handler.use(bodyStringifier())

        const event = {
            httpMethod: 'GET'
        }

        return new Promise((resolve) => {
            handler(event, {}, (_, response) => {
                assert(JSON.stringify(response) === JSON.stringify({ body: '{\n  "foo": "bar"\n}' }));
                resolve();
            });
        });
    });

    it ('When handler.response.body is not object, response.body is not changed.', () => {
        const beforeResponse = {
            body: 'response'
        };

        const handler = middy((event, context, cb) => {
            cb(null, beforeResponse);
        });

        handler.use(bodyStringifier())

        const event = {
            httpMethod: 'GET'
        }

        return new Promise((resolve) => {
            handler(event, {}, (_, response) => {
                assert(JSON.stringify(response) === JSON.stringify(beforeResponse));
                resolve();
            });
        });
    });

    it ('When event has no httpMethod, response.body is not changed.', () => {
        const beforeResponse = {
            body: {
                foo: 'bar'
            }
        };

        const handler = middy((event, context, cb) => {
            cb(null, beforeResponse);
        });

        handler.use(bodyStringifier())

        const event = {};

        return new Promise((resolve) => {
            handler(event, {}, (_, response) => {
                assert(JSON.stringify(response) === JSON.stringify(beforeResponse));
                resolve();
            });
        });
    });
});
