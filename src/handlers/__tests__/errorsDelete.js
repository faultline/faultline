'use strict';
const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('power-assert');

const {
    mockAws
} = require('../../lib/mockUtility');

const errorsPostHandler = require('./../errorsPost.js').handlerBuilder(mockAws);
const handler = require('./../errorsDelete.js').handlerBuilder(mockAws);

describe('errorsDelete.handler', () => {
    beforeEach(() => {
        const event = {
            httpMethod: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
        return mockAws.createResources().then(() => {
            return new Promise((resolve) => {
                errorsPostHandler(event, context, (error, response) => {
                    resolve();
                });
            });
        });
    });

    afterEach(() => {
        return mockAws.deleteResources();
    });

    it ('DELETE error, response.statusCode should be 204', () => {
        const event = {
            httpMethod: 'DELETE',
            headers: {
                'X-Api-Key': process.env.FAULTLINE_MASTER_API_KEY
            },
            pathParameters: {
                project: encodeURIComponent('sample-project'),
                message: encodeURIComponent('Undefined index: faultline')
            }
        };
        const context = {};

        return new Promise((resolve) => {
            const cb = (error, response) => {
                assert(error === null);
                assert(response.statusCode === 204);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
                resolve();
            };
            handler(event, context, cb);
        });
    });

    it ('When invalid X-Api-Key, response should be 403 error', () => {
        const event = {
            httpMethod: 'DELETE',
            headers: {
                'X-Api-Key': 'Invalid'
            },
            pathParameters: {
                project: encodeURIComponent('sample-project'),
                message: encodeURIComponent('Undefined index: faultline')
            }
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
});
