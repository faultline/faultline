'use strict';

const console = require('console');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const aws = new Aws();
const {
    bucketName,
    errorByMessageTable,
    errorByTimeunitTable
} = require('../lib/constants');
const {
    resgen,
    checkApiKey
} = require('../lib/functions');

class ErrorsDeleteHandler extends Handler {
    constructor(aws) {
        return (event, context, cb) => {
            // Check faultline API Key
            if (!checkApiKey(event)) {
                const response = resgen(403, { errors: [{ message: '403 Forbidden' }] });
                cb(null, response);
                return;
            }

            const project = decodeURIComponent(event.pathParameters.project);
            const message = decodeURIComponent(event.pathParameters.message);
            const key = [project, message].join('##');

            const recursiveDeleteDocByKey = (key) => {
                const limit = 500;
                const params = {
                    TableName: errorByTimeunitTable,
                    KeyConditionExpression: '#key = :key',
                    ExpressionAttributeNames:{
                        '#key':'key'
                    },
                    ExpressionAttributeValues: {
                        ':key':key
                    },
                    Limit: limit
                };
                let promises = [];
                return aws.storage.queryDoc(params)
                    .then((data) => {
                        const errors = data.Items;
                        errors.forEach((e) => {
                            const docParams = {
                                TableName: errorByTimeunitTable,
                                Key: {
                                    key:e.key,
                                    timestamp:e.timestamp
                                },
                                ReturnValues:'NONE'
                            };
                            // docParams
                            promises.push(aws.storage.deleteDoc(docParams));
                        });

                        const docParams = {
                            TableName: errorByMessageTable,
                            Key: {
                                project:project,
                                message:message
                            },
                            ReturnValues:'NONE'
                        };
                        promises.push(aws.storage.deleteDoc(docParams));

                        return Promise.all(promises);
                    })
                    .then(() => {
                        if (promises.length == limit) {
                            return recursiveDeleteDocByKey(key);
                        }
                        return Promise.resolve();
                    });
            };

            recursiveDeleteDocByKey(key)
                .then(() => {
                    const bucketParams = {
                        Bucket: bucketName,
                        Prefix: 'projects/' + project + '/errors/' + message + '/'
                    };

                    return aws.storage.recursiveDeleteObjects(bucketParams);
                })
                .then(() => {
                    const response = resgen(204, null);
                    cb(null, response);
                    return;
                })
                .catch((err) => {
                    console.error(err);
                    const response = resgen(500, { errors: [{ message: 'Unable to DELETE error', detail: err }] });
                    cb(null, response);
                });
        };
    }
}
module.exports.ErrorsDeleteHandler = ErrorsDeleteHandler;

module.exports.handler = new ErrorsDeleteHandler(aws);
