'use strict';
const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('power-assert');
const moment = require('moment');

const {
    mockAws
} = require('../../lib/mockUtility');

const errorsPostHandler = require('./../errorsPost.js').handlerBuilder(mockAws);
const handler = require('./../deleteExpiredErrors.js').handlerBuilder(mockAws);

describe('deleteExpiredErrors.handler', () => {
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

    it ('When there are expired errors and invoke handler, Delete errors', () => {
        const event = {};
        const context = {};

        const docParams = {
            TableName: mockAws.constants.errorByMessageTable,
            Key: {
                'project':'sample-project',
                'message':'Undefined index: faultline'
            },
            UpdateExpression: 'SET #lastUpdated=:lastUpdated',
            ExpressionAttributeNames:{
                '#lastUpdated':'lastUpdated'
            },
            ExpressionAttributeValues:{
                ':lastUpdated':moment('2016-11-02T00:01:00+00:00').format()
            },
            ReturnValues:'ALL_NEW'
        };

        return mockAws.storage.updateDoc(docParams).then(() => {
            return new Promise((resolve) => {
                const cb = (error, response) => {
                    assert(error === null);
                    assert(JSON.stringify(response) === JSON.stringify({
                        data: {
                            deleteCount: 1
                        }
                    }));
                    resolve();
                };
                handler(event, context, cb);
            });
        });
    });

    it ('When process.env.FAULTLINE_ERROR_DATA_RETENTION_IN_DAYS=-1, No delete errors', () => {
        const event = {};
        const context = {};
        process.env.FAULTLINE_ERROR_DATA_RETENTION_IN_DAYS = '-1';

        const docParams = {
            TableName: mockAws.constants.errorByMessageTable,
            Key: {
                'project':'sample-project',
                'message':'Undefined index: faultline'
            },
            UpdateExpression: 'SET #lastUpdated=:lastUpdated',
            ExpressionAttributeNames:{
                '#lastUpdated':'lastUpdated'
            },
            ExpressionAttributeValues:{
                ':lastUpdated':moment('2016-11-02T00:01:00+00:00').format()
            },
            ReturnValues:'ALL_NEW'
        };

        return mockAws.storage.updateDoc(docParams).then(() => {
            return new Promise((resolve) => {
                const cb = (error, response) => {
                    assert(error === null);
                    assert(response === 'Error data retention in days is unlimited');
                    resolve();
                };
                handler(event, context, cb);
            });
        });
    });
});
