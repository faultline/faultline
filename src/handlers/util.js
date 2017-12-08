'use strict';

const console = require('console');
const moment = require('moment');
const resgen = require('../lib/resgen');
const storage = require('../lib/storage');
const checkApiKey = require('../lib/check_api_key');
const aws = require('../lib/aws')();
const kms = aws.kms;
const lambda = aws.lambda;
const bucketName = process.env.FAULTLINE_S3_BUCKET_NAME;
const errorByMessageTable = process.env.FAULTLINE_DYNAMODB_TABLE_PREFIX + 'Error';
const errorDataRetentionInDays = process.env.FAULTLINE_ERROR_DATA_RETENTION_IN_DAYS;
const errorsDeleteFunctionName = [process.env.FAULTLINE_SERVICE_NAME, process.env.FAULTLINE_STAGE, 'errorsDelete'].join('-');

module.exports.encrypt = (event, context, cb) => {
    if (!process.env.FAULTLINE_MASTER_API_KEY || !process.env.FAULTLINE_USE_KMS || !process.env.FAULTLINE_KMS_KEY_ALIAS) {
        const response = resgen(412, { errors: [{ message: '412 Precondition Failed: masterApiKey' }] });
        cb(null, response);
        return;
    }
    if (!checkApiKey(event)) {
        const response = resgen(403, { errors: [{ message: '403 Forbidden' }] });
        cb(null, response);
        return;
    }
    const body = event.body;
    const keyAlias = `alias/${process.env.FAULTLINE_KMS_KEY_ALIAS}`;
    kms.listAliases().promise()
        .then((res) => {
            const key = res.Aliases.find((k) => {
                return (k.AliasName == keyAlias);
            });
            const keyId = key.TargetKeyId;
            return kms.encrypt({
                KeyId: keyId,
                Plaintext: body
            }).promise();
        })
        .then((res) => {
            const encrypted = res.CiphertextBlob.toString('base64');
            const response = resgen(201, { data: { encrypted: encrypted }});
            cb(null, response);
        })
        .catch((err) => {
            console.error(err);
            const response = resgen(500, { errors: [{ message: 'Unable to POST error', detail: err }] });
            cb(null, response);
        });
};

module.exports.deleteExpiredErrors = (event, context, cb) => {
    if (Number(errorDataRetentionInDays) < 0) {
        cb(null, 'Error data retention in days is unlimited');
        return;
    }
    // projects -> errors (filter lastUpdated) -> invoke errorsDelete
    const params = {
        Bucket: bucketName,
        Delimiter: '/',
        EncodingType: 'url',
        Prefix: 'projects/'
    };

    const expireDatetime = moment().day(errorDataRetentionInDays * -1);

    storage.listObjects(params)
        .then((data) => {
            const promisses = data.CommonPrefixes.map((prefix) => {
                const project = decodeURIComponent(prefix.Prefix.replace(/projects\/([^\/]+)\//,'$1'));
                const params = {
                    TableName: errorByMessageTable,
                    KeyConditionExpression: '#project = :project',
                    ExpressionAttributeNames:{
                        '#project':'project'
                    },
                    ExpressionAttributeValues: {
                        ':project':project
                    }
                };
                return storage.queryDoc(params).then((data) => {
                    return data.Items;
                });
            });
            return Promise.all(promisses);
        })
        .then((data) => {
            const expiredErrors = data.reduce((a, b) => { return a.concat(b); }).filter((e) => {
                return moment(e.lastUpdated).isBefore(expireDatetime);
            });
            const promisses = expiredErrors.map((e) => {
                const params = {
                    FunctionName: errorsDeleteFunctionName,
                    InvocationType: 'Event',
                    Payload: JSON.stringify({
                        headers: {
                            'X-Api-Key': process.env.FAULTLINE_MASTER_API_KEY
                        },
                        pathParameters: {
                            project: e.project,
                            message: decodeURIComponent(e.message)
                        }
                    })
                };
                return lambda.invoke(params).promise();
            });
            return Promise.all(promisses);
        })
        .then((res) => {
            cb(null, {
                data: {
                    deleteCount: res.length
                }
            });
        })
        .catch((err) => {
            console.error(err);
            cb('Unable to delete error', err);
        });
};
