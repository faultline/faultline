'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const serverlessConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/../../serverless.yml', 'utf8'));
const AWS = require('aws-sdk');
const sts = new AWS.STS({apiVersion: '2011-06-15'});

module.exports.resources = () => {
    return sts.getCallerIdentity({}).promise().then((data) => {
        const accountId = data.Account;
        const callerArn = data.Arn;
        let resources = {
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
            }
        };

        if (config.logRetentionInDays) {
            const logResources = {
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
            resources = Object.assign(resources, logResources);
        }

        if (config.useKms && config.kmsKeyAlias) {
            const kmsResources = {
                FaultlineKey: {
                    Type: 'AWS::KMS::Key',
                    Properties: {
                        Description:'Key to encrypt POST params / faultline',
                        Enabled: true,
                        KeyPolicy: {
                            Version: '2012-10-17',
                            Id: `${serverlessConfig.service}-key`,
                            Statement: [
                                {
                                    Sid: 'Allow administration of the key / faultline',
                                    Effect: 'Allow',
                                    Principal: { AWS: [
                                        `arn:aws:iam::${accountId}:root`, // root
                                        callerArn // callerIdentity
                                    ]},
                                    Action: [
                                        'kms:*'
                                    ],
                                    Resource: '*'
                                },
                                {
                                    Sid: 'Allow use of the key',
                                    Effect: 'Allow',
                                    Principal: {
                                        AWS: { 'Fn::GetAtt': [
                                            'IamRoleLambdaExecution',
                                            'Arn'
                                        ] }
                                    },
                                    Action: [
                                        'kms:Encrypt',
                                        'kms:Decrypt',
                                        'kms:ListAliases'
                                    ],
                                    'Resource': '*'
                                }
                            ]
                        }
                    }
                },
                FaultlineKeyAlias: {
                    Type: 'AWS::KMS::Alias',
                    Properties: {
                        AliasName: `alias/${config.kmsKeyAlias}`,
                        TargetKeyId: { Ref: 'FaultlineKey'}
                    }
                }
            };
            resources = Object.assign(resources, kmsResources);
        }

        return resources;
    });
};
