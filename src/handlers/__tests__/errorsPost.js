'use strict';
const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('power-assert');

const {
    mockAws
} = require('../../lib/mockUtility');

const handler = require('./../errorsPost.js').handlerBuilder(mockAws);

describe('errorsPost.handler', () => {
    beforeEach((done) => {
        mockAws.createResources(done);
    });

    afterEach((done) => {
        mockAws.deleteResources(done);
    });

    it ('POST error, response.statusCode should be 201', (done) => {
        const event = {
            httpMethod: 'POST',
            headers: {
                'X-Api-Key': process.env.FAULTLINE_CLIENT_API_KEY
            },
            pathParameters: {
                project: 'sample-project'
            },
            body: JSON.stringify({
                errors: [
                    {
                        type: 'notice',
                        message: 'Undefined index: faultline',
                        backtrace: [
                            {
                                file: '/var/www/test/test.php',
                                line: 15,
                                function: 'SomeClass->__construct()'
                            },
                            {
                                file: '/var/www/test/SomeClass.class.php',
                                line: 36,
                                function: 'SomeClass->callSomething()'
                            }
                        ],
                        timestamp: '2016-11-02T00:01:00+00:00'
                    },
                ],
                notifications: []
            })
        };
        const context = {};

        const cb = (error, response) => {
            return Promise.resolve().then(() => {
                assert(error === null);
                assert(response.statusCode === 201);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
            }).then(done, done);
        };
        handler(event, context, cb);
    });

    it ('When invalid X-Api-Key, response should be 403 error', (done) => {
        const event = {
            httpMethod: 'POST',
            headers: {
                'X-Api-Key': 'Invalid'
            },
            pathParameters: {
                project: 'sample-project'
            },
            body: JSON.stringify({
                errors: [
                    {
                        type: 'notice',
                        message: 'Undefined index: faultline',
                        backtrace: [
                            {
                                file: '/var/www/test/test.php',
                                line: 15,
                                function: 'SomeClass->__construct()'
                            },
                            {
                                file: '/var/www/test/SomeClass.class.php',
                                line: 36,
                                function: 'SomeClass->callSomething()'
                            }
                        ],
                        timestamp: '2016-11-02T00:01:00+00:00'
                    },
                ],
                notifications: []
            })
        };
        const context = {};

        const cb = (error, response) => {
            return Promise.resolve().then(() => {
                assert(error === null);
                assert(response.statusCode === 403);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
                assert(response.body === JSON.stringify({ errors: [{ message: '403 Forbidden' }] }, null, 2));
            }).then(done, done);
        };
        handler(event, context, cb);
    });
});
