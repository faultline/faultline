'use strict';
const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('power-assert');

const {
    mockAws
} = require('../../lib/mock');

const { ErrorsPostHandler } = require('./../errorsPost.js');
const { ProjectsListHandler } = require('./../projectsList.js');
const errorsPostHandler = new ErrorsPostHandler(mockAws);
const handler = new ProjectsListHandler(mockAws);

describe('projectsList.handler', () => {
    beforeEach((done) => {
        const event = {
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

    it ('GET projects, response.statusCode should be 200', (done) => {
        const event = {
            headers: {
                'X-Api-Key': process.env.FAULTLINE_MASTER_API_KEY
            },
            pathParameters: {
                project: encodeURIComponent('sample-project')
            }
        };
        const context = {};

        const cb = (error, response) => {
            return Promise.resolve().then(() => {
                assert(error === null);
                assert(response.statusCode === 200);
            }).then(done, done);
        };

        handler(event, context, cb);
    });
});
