'use strict';
const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('power-assert');
const moment = require('moment');
const {
    timeunitFormat,
    reversedUnixtime
} = require('../../lib/functions');

const {
    mockAws
} = require('../../lib/mock');

const { ErrorsPostHandler } = require('./../errorsPost.js');
const { OccurrencesGetHandler } = require('./../occurrencesGet.js');
const errorsPostHandler = new ErrorsPostHandler(mockAws);
const handler = new OccurrencesGetHandler(mockAws);

describe('occurrencesGet.handler', () => {
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

    it ('GET error occrrence, response.statusCode should be 200', (done) => {
        const unixtime = moment('2016-11-02T00:01:00+00:00').unix();
        const event = {
            headers: {
                'X-Api-Key': process.env.FAULTLINE_MASTER_API_KEY
            },
            pathParameters: {
                project: encodeURIComponent('sample-project'),
                message: encodeURIComponent('Undefined index: faultline'),
                reversedUnixtime: encodeURIComponent(reversedUnixtime(unixtime))
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
