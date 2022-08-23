'use strict';

const AWS = require('aws-sdk');
const Aws = require('./aws');

process.env.FAULTLINE_SERVICE_NAME = 'faultline';
process.env.FAULTLINE_STAGE = 'test';
process.env.FAULTLINE_REGION = 'us-east-1';
process.env.FAULTLINE_TIMEUNIT = 'minute';
process.env.FAULTLINE_ERROR_DATA_RETENTION_IN_DAYS = 180;
process.env.FAULTLINE_S3_BUCKET_NAME = 'faultline-test-bucket';
process.env.FAULTLINE_DYNAMODB_TABLE_PREFIX = 'faultline-';
process.env.FAULTLINE_DYNAMODB_TABLE_SUFFIX = '-test';
process.env.FAULTLINE_MASTER_API_KEY = 'MASTER_API_KEY';
process.env.FAULTLINE_CLIENT_API_KEY = 'CLIENT_API_KEY';
process.env.FAULTLINE_USE_KMS = '1';
process.env.FAULTLINE_KMS_KEY_ALIAS = 'faultline-test';

const sleep = (time) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
};

AWS.config.region = process.env.FAULTLINE_REGION;
const mockResource = {
    s3: new AWS.S3({
        apiVersion: '2006-03-01',
        endpoint: new AWS.Endpoint('http://localhost:4566'),
        s3ForcePathStyle: true,
        accessKeyId: 'DUMMY',
        secretAccessKey: 'DUMMY',
        region: process.env.FAULTLINE_REGION
    }),
    dynamoDB: new AWS.DynamoDB({
        apiVersion: '2012-08-10',
        endpoint: new AWS.Endpoint('http://localhost:4566'),
        accessKeyId: 'DUMMY',
        secretAccessKey: 'DUMMY',
        region: process.env.FAULTLINE_REGION
    }),
    docClient: new AWS.DynamoDB.DocumentClient({
        apiVersion: '2012-08-10',
        endpoint: new AWS.Endpoint('http://localhost:4566'),
        accessKeyId: 'DUMMY',
        secretAccessKey: 'DUMMY',
        region: process.env.FAULTLINE_REGION
    }),
    lambda: {
        invoke: (params) => {
            return {
                promise: () => {
                    return Promise.resolve({});
                }
            };
        }
    },
    kms: {}
};

const mockAws = new Aws(mockResource);
const constants = require('./constants');
mockAws.constants = constants;

mockAws.createResources = () => {
    return mockAws.s3.createBucket({Bucket: constants.bucketName}).promise()
        .then(mockAws.dynamoDB.createTable({
            AttributeDefinitions: [
                {
                    AttributeName: 'project',
                    AttributeType: 'S'
                },
                {
                    AttributeName: 'message',
                    AttributeType: 'S'
                },
                {
                    AttributeName: 'status',
                    AttributeType: 'S'
                }
            ],
            KeySchema: [
                {
                    AttributeName: 'project',
                    KeyType: 'HASH'
                },
                {
                    AttributeName: 'message',
                    KeyType: 'RANGE'
                }
            ],
            LocalSecondaryIndexes: [
                {
                    IndexName: 'FaultlineProjectAndStatus',
                    KeySchema: [
                        {
                            AttributeName: 'project',
                            KeyType: 'HASH'
                        },
                        {
                            AttributeName: 'status',
                            KeyType: 'RANGE'
                        }
                    ],
                    Projection: {
                        ProjectionType: 'ALL'
                    }
                }
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1
            },
            TableName: constants.errorByMessageTable
        }).promise())
        .then(mockAws.dynamoDB.createTable({
            AttributeDefinitions: [
                {
                    AttributeName: 'key', // project##message
                    AttributeType: 'S'
                },
                {
                    AttributeName: 'timestamp', // timestamp
                    AttributeType: 'S'
                }
            ],
            KeySchema: [
                {
                    AttributeName: 'key',
                    KeyType: 'HASH'
                },
                {
                    AttributeName: 'timestamp',
                    KeyType: 'RANGE'
                }
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1
            },
            TableName: constants.errorByTimeunitTable
        }).promise());
};

mockAws.deleteResources = () => {
    return mockAws.storage.recursiveDeleteObjects({Bucket: constants.bucketName})
    // .then(mockAws.s3.deleteBucket({Bucket: bucketName}).promise())
        .then(mockAws.dynamoDB.deleteTable({TableName: constants.errorByMessageTable}).promise())
        .then(mockAws.dynamoDB.deleteTable({TableName: constants.errorByTimeunitTable}).promise())
        .then(() => { return sleep(300); });
};

module.exports = constants;
module.exports.mockAws = mockAws;
module.exports.sleep = sleep;
