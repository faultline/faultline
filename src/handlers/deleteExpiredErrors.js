'use strict';

const console = require('console');
const middy = require('middy');
const moment = require('moment');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const aws = new Aws();
const {
    bucketName,
    errorByMessageTable,
    errorsDeleteFunctionName
} = require('../lib/constants');

class DeleteExpiredErrorsHander extends Handler {
    constructor(aws) {
        const lambda = aws.lambda;
        return (event, context, cb) => {
            const errorDataRetentionInDays = process.env.FAULTLINE_ERROR_DATA_RETENTION_IN_DAYS;
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

            aws.storage.listObjects(params)
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
                        return aws.storage.queryDoc(params).then((data) => {
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

    }
}
const handlerBuilder = (aws) => {
    return middy(new DeleteExpiredErrorsHander(aws));
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
