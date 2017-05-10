'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../config.yml', 'utf8'));
const AWS = require('aws-sdk');
const sts = new AWS.STS({apiVersion: '2011-06-15'});

class KmsResources {
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options;
        this.provider = this.serverless.getProvider('aws');
        this.roleName = this.provider.naming.getRoleName();

        this.hooks = {
            'before:deploy:initialize': () => {
                return this.beforeDeployResources(this);
            }
        };
    }
    beforeDeployResources(t) {
        if (!config.useKms || !config.kmsKeyAlias) {
            return true;
        }
        return sts.getCallerIdentity({}).promise().then((data) => {
            const accountId = data.Account;
            const callerArn = data.Arn;
            const kmsResources = {
                FaultlineKey: {
                    Type: 'AWS::KMS::Key',
                    Properties: {
                        Description:'Key to encrypt POST params / faultline',
                        Enabled: true,
                        KeyPolicy: {
                            Version: '2012-10-17',
                            Id: `${t.service}-key`,
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
                                        AWS: { 'Fn::Join': [ '/', [ `arn:aws:iam::${accountId}:role`, t.roleName ] ] } // lambdaRole
                                    },
                                    Action: [
                                        'kms:Encrypt',
                                        'kms:Decrypt',
                                        'kms:ReEncrypt',
                                        'kms:GenerateDataKey*',
                                        'kms:DescribeKey'
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
            t.serverless.service.resources.Resources = Object.assign(t.serverless.service.resources.Resources, kmsResources);
        });
    }
}

module.exports = KmsResources;
