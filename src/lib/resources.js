'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));

module.exports.resources = () => {
    return {
        FaultlineBucket: {
            Type: 'AWS::S3::Bucket',
            Properties: {
                BucketName: config.s3BucketName
            }
        },
        FaultlineTable: {
            Type: 'AWS::DynamoDB::Table',
            Properties: {
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
                TableName: `${config.dynamodbTablePrefix}Error`
            }
        },
        FaultlineTableByTimeunit: {
            Type: 'AWS::DynamoDB::Table',
            Properties: {
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
                TableName: `${config.dynamodbTablePrefix}ErrorByTimeunit`
            }
        },
        ProjectsListLogGroup: {
            Type: 'AWS::Logs::LogGroup',
            Properties: {
                RetentionInDays: config.logRetentionInDays
            }
        },
        ProjectsDeleteLogGroup: {
            Type: 'AWS::Logs::LogGroup',
            Properties: {
                RetentionInDays: config.logRetentionInDays
            }
        },
        ErrorsPostLogGroup: {
            Type: 'AWS::Logs::LogGroup',
            Properties: {
                RetentionInDays: config.logRetentionInDays
            }
        },
        ErrorsListLogGroup: {
            Type: 'AWS::Logs::LogGroup',
            Properties: {
                RetentionInDays: config.logRetentionInDays
            }
        },
        ErrorsGetLogGroup: {
            Type: 'AWS::Logs::LogGroup',
            Properties: {
                RetentionInDays: config.logRetentionInDays
            }
        },
        ErrorsPatchLogGroup: {
            Type: 'AWS::Logs::LogGroup',
            Properties: {
                RetentionInDays: config.logRetentionInDays
            }
        },
        ErrorsDeleteLogGroup: {
            Type: 'AWS::Logs::LogGroup',
            Properties: {
                RetentionInDays: config.logRetentionInDays
            }
        },
        CallNotificationsLogGroup: {
            Type: 'AWS::Logs::LogGroup',
            Properties: {
                RetentionInDays: config.logRetentionInDays
            }
        }
    };
};
