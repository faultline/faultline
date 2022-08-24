'use strict';

const BbPromise = require('bluebird');
const AWS = require('aws-sdk');
const sts = new AWS.STS({apiVersion: '2011-06-15'});

class FaultlineResources {
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options || {};
        this.environment = this.serverless.service.provider.environment;

        this.hooks = {
            'package:initialize': () => BbPromise.bind(this)
                .then(this.buildResources)
        };
    }

    buildResources() {
        const self = this;
        const env = self.serverless.service.provider.environment;
        return sts.getCallerIdentity({}).promise().then((data) => {
            const accountId = data.Account;
            const callerArn = data.Arn;
            let resources = {
                FaultlineBucket: {
                    Type: 'AWS::S3::Bucket',
                    Properties: {
                        BucketName: env.FAULTLINE_S3_BUCKET_NAME
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
                            ReadCapacityUnits: Number(env.FAULTLINE_DYNAMODB_READ_CAPACITY_UNITS),
                            WriteCapacityUnits: Number(env.FAULTLINE_DYNAMODB_WRITE_CAPACITY_UNITS)
                        },
                        TableName: `${env.FAULTLINE_DYNAMODB_TABLE_PREFIX}Error${env.FAULTLINE_DYNAMODB_TABLE_SUFFIX}`
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
                            ReadCapacityUnits: Number(env.FAULTLINE_DYNAMODB_READ_CAPACITY_UNITS),
                            WriteCapacityUnits: Number(env.FAULTLINE_DYNAMODB_WRITE_CAPACITY_UNITS)
                        },
                        TableName: `${env.FAULTLINE_DYNAMODB_TABLE_PREFIX}ErrorByTimeunit${env.FAULTLINE_DYNAMODB_TABLE_SUFFIX}`
                    }
                }
            };

            if (env.FAULTLINE_LOG_RETENTION_IN_DAYS >= 0) {
                const logResources = {
                    ProjectsListLogGroup: {
                        Type: 'AWS::Logs::LogGroup',
                        Properties: {
                            RetentionInDays: env.FAULTLINE_LOG_RETENTION_IN_DAYS
                        }
                    },
                    ProjectsDeleteLogGroup: {
                        Type: 'AWS::Logs::LogGroup',
                        Properties: {
                            RetentionInDays: env.FAULTLINE_LOG_RETENTION_IN_DAYS
                        }
                    },
                    ErrorsPostLogGroup: {
                        Type: 'AWS::Logs::LogGroup',
                        Properties: {
                            RetentionInDays: env.FAULTLINE_LOG_RETENTION_IN_DAYS
                        }
                    },
                    ErrorsListLogGroup: {
                        Type: 'AWS::Logs::LogGroup',
                        Properties: {
                            RetentionInDays: env.FAULTLINE_LOG_RETENTION_IN_DAYS
                        }
                    },
                    ErrorsGetLogGroup: {
                        Type: 'AWS::Logs::LogGroup',
                        Properties: {
                            RetentionInDays: env.FAULTLINE_LOG_RETENTION_IN_DAYS
                        }
                    },
                    ErrorsPatchLogGroup: {
                        Type: 'AWS::Logs::LogGroup',
                        Properties: {
                            RetentionInDays: env.FAULTLINE_LOG_RETENTION_IN_DAYS
                        }
                    },
                    ErrorsDeleteLogGroup: {
                        Type: 'AWS::Logs::LogGroup',
                        Properties: {
                            RetentionInDays: env.FAULTLINE_LOG_RETENTION_IN_DAYS
                        }
                    },
                    CallNotificationsLogGroup: {
                        Type: 'AWS::Logs::LogGroup',
                        Properties: {
                            RetentionInDays: env.FAULTLINE_LOG_RETENTION_IN_DAYS
                        }
                    },
                    OccurrencesListLogGroup: {
                        Type: 'AWS::Logs::LogGroup',
                        Properties: {
                            RetentionInDays: env.FAULTLINE_LOG_RETENTION_IN_DAYS
                        }
                    },
                    OccurrencesGetLogGroup: {
                        Type: 'AWS::Logs::LogGroup',
                        Properties: {
                            RetentionInDays: env.FAULTLINE_LOG_RETENTION_IN_DAYS
                        }
                    },
                    EncryptLogGroup: {
                        Type: 'AWS::Logs::LogGroup',
                        Properties: {
                            RetentionInDays: env.FAULTLINE_LOG_RETENTION_IN_DAYS
                        }
                    }
                };
                resources = Object.assign(resources, logResources);
            }

            if (Number(env.FAULTLINE_USE_KMS) && env.FAULTLINE_KMS_KEY_ALIAS) {
                const kmsResources = {
                    FaultlineKey: {
                        Type: 'AWS::KMS::Key',
                        Properties: {
                            Description:'Key to encrypt POST params / faultline',
                            Enabled: true,
                            KeyPolicy: {
                                Version: '2012-10-17',
                                Id: `${env.FAULTLINE_SERVICE_NAME}-key`,
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
                            AliasName: `alias/${env.FAULTLINE_KMS_KEY_ALIAS}`,
                            TargetKeyId: { Ref: 'FaultlineKey'}
                        }
                    }
                };
                resources = Object.assign(resources, kmsResources);
            }
            self.serverless.service.resources = {
                Resources: resources
            };
            // enable deleteExpiredErrors function
            if (Number(env.FAULTLINE_ERROR_DATA_RETENTION_IN_DAYS) > -1) {
                self.serverless.service.functions.deleteExpiredErrors.events[0].schedule.enabled = true;
            }
            return BbPromise.resolve();
        });
    }
}

module.exports = FaultlineResources;
