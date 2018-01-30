'use strict';
const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('power-assert');

const {
    mockAws
} = require('../../lib/mockUtility');

const errorsPostHandler = require('./../errorsPost.js').handlerBuilder(mockAws);
const handler = require('./../errorsList.js').handlerBuilder(mockAws);

describe('errorsList.handler', () => {
    beforeEach((done) => {
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
        mockAws.createResources(() => {
            errorsPostHandler(event, context, (error, response) => {
                done();
            });
        });
    });

    afterEach((done) => {
        mockAws.deleteResources(done);
    });

    it ('GET errors, response.statusCode should be 200', (done) => {
        const event = {
            httpMethod: 'GET',
            headers: {
                'X-Api-Key': process.env.FAULTLINE_MASTER_API_KEY
            },
            pathParameters: {
                project: encodeURIComponent('sample-project'),
                message: encodeURIComponent('Undefined index: faultline')
            }
        };
        const context = {};

        const cb = (error, response) => {
            return Promise.resolve().then(() => {
                assert(error === null);
                assert(response.statusCode === 200);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
            }).then(done, done);
        };

        handler(event, context, cb);
    });

    it ('When invalid X-Api-Key, response should be 403 error', (done) => {
        const event = {
            httpMethod: 'GET',
            headers: {
                'X-Api-Key': 'Invalid'
            },
            pathParameters: {
                project: encodeURIComponent('sample-project'),
                message: encodeURIComponent('Undefined index: faultline')
            }
        };
        const context = {};

        const cb = (error, response) => {
            return Promise.resolve().then(() => {
                assert(error === null);
                assert(response.statusCode === 403);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
            }).then(done, done);
        };

        handler(event, context, cb);
    });
});
