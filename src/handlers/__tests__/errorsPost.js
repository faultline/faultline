'use strict';
const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('power-assert');
const Ajv = require('ajv');
const deref = require('json-schema-deref-sync');
const { mockAws } = require('../../lib/mockUtility');
const {
    rootSchema
} = require('../../lib/constants');
const ajvKeywords = require('ajv-keywords');
const ajv = new Ajv({v5: true, $data: true, allErrors: true});
ajvKeywords(ajv);
const targetSchema = deref(rootSchema).properties.error.links.find((l) => {
    return l.rel == 'create';
}).targetSchema;

const handler = require('./../errorsPost.js').handlerBuilder(mockAws);

describe('errorsPost.handler', () => {
    beforeEach(() => {
        return mockAws.createResources();
    });

    afterEach(() => {
        return mockAws.deleteResources();
    });

    it ('POST error, response.statusCode should be 201', () => {
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

        return new Promise((resolve) => {
            const cb = (error, response) => {
                assert(error === null);
                assert(response.statusCode === 201);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
                assert(ajv.validate(targetSchema, response.body));
                resolve();
            };
            handler(event, context, cb);
        });
    });

    it ('When invalid X-Api-Key, response should be 403 error', () => {
        const event = {
            httpMethod: 'POST',
            headers: {
                'Content-Type': 'application/json',
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

        return new Promise((resolve) => {
            const cb = (error, response) => {
                assert(error === null);
                assert(response.statusCode === 403);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
                assert(response.body === JSON.stringify({ errors: [{ message: '403 Forbidden' }] }, null, 2));
                resolve();
            };
            handler(event, context, cb);
        });
    });

    it ('When invalid body, response should be 400 error', () => {
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
                invalid: {}
            })
        };
        const context = {};

        return new Promise((resolve) => {
            const cb = (error, response) => {
                assert(error === null);
                assert(response.statusCode === 400);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
                resolve();
            };
            handler(event, context, cb);
        });
    });

    it ('When invalid project name (e.g. include space), response should be 400 error', () => {
        const event = {
            httpMethod: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': process.env.FAULTLINE_CLIENT_API_KEY
            },
            pathParameters: {
                project: 'invalid project name'
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

        return new Promise((resolve) => {
            const cb = (error, response) => {
                assert(error === null);
                assert(response.statusCode === 400);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
                resolve();
            };
            handler(event, context, cb);
        });
    });

    it ('When project name is too long, response should be 400 error', () => {
        const event = {
            httpMethod: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': process.env.FAULTLINE_CLIENT_API_KEY
            },
            pathParameters: {
                project: 'too-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-long-project-name'
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

        return new Promise((resolve) => {
            const cb = (error, response) => {
                assert(error === null);
                assert(response.statusCode === 400);
                assert(response.headers['Access-Control-Allow-Origin'] === '*');
                resolve();
            };
            handler(event, context, cb);
        });
    });
});
