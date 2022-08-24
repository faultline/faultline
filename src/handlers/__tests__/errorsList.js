'use strict';
const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('power-assert');
const Ajv = require('ajv');
const deref = require('json-schema-deref-sync');
const { mockAws } = require('../../lib/mockUtility');
const { rootSchema } = require('../../lib/constants');
const ajvKeywords = require('ajv-keywords');
const ajv = new Ajv({ v5: true, $data: true, allErrors: true });
ajvKeywords(ajv);
const targetSchema = deref(rootSchema).properties.error.links.find((l) => {
    return l.rel == 'errors';
}).targetSchema;

const errorsPostHandler = require('./../errorsPost.js').handlerBuilder(mockAws);
const handler = require('./../errorsList.js').handlerBuilder(mockAws);

describe('errorsList.handler', () => {
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

    it ('GET errors, response.statusCode should be 200', () => {
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

        return new Promise((resolve) => {
            const cb = (error, response) => {
                assert(error === null);
                assert(response.statusCode === 200);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
                assert(ajv.validate(targetSchema, response.body));
                const parsed = JSON.parse(response.body);
                assert(parsed.data.errors.length === 1);
                resolve();
            };
            handler(event, context, cb);
        });
    });

    it ('GET `resolved` errors, 0 errors', () => {
        const event = {
            httpMethod: 'GET',
            headers: {
                'X-Api-Key': process.env.FAULTLINE_MASTER_API_KEY
            },
            pathParameters: {
                project: encodeURIComponent('sample-project'),
                message: encodeURIComponent('Undefined index: faultline')
            },
            queryStringParameters: {
                status: 'resolved'
            }
        };
        const context = {};

        return new Promise((resolve) => {
            const cb = (error, response) => {
                assert(ajv.validate(targetSchema, response.body));
                const parsed = JSON.parse(response.body);
                assert(parsed.data.errors.length === 0);
                resolve();
            };
            handler(event, context, cb);
        });
    });

    it ('When invalid X-Api-Key, response should be 403 error', () => {
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
