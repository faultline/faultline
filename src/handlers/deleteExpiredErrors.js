'use strict';

const console = require('console');
const moment = require('moment');
const storage = require('../lib/storage');
const aws = require('../lib/aws')();
const lambda = aws.lambda;
const {
    bucketName,
    errorByMessageTable,
    errorDataRetentionInDays,
    errorsDeleteFunctionName
} = require('../lib/constants');

module.exports.handler = (event, context, cb) => {
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
