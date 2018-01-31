'use strict';

const console = require('console');
const createError = require('http-errors');
const middy = require('middy');
const { cors, httpErrorHandler, httpHeaderNormalizer } = require('middy/middlewares');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const { checkApiKey, bodyStringifier } = require('../lib/middlewares');
const aws = new Aws();
const {
    bucketName,
    errorByMessageTable,
    errorByTimeunitTable
} = require('../lib/constants');
const {
    createResponse
} = require('../lib/functions');

class ErrorsDeleteHandler extends Handler {
    constructor(aws) {
        return (event, context, cb) => {
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
                    const response = createResponse(204, null);
                    cb(null, response);
                    return;
                })
                .catch((err) => {
                    console.error(err);
                    throw new createError.InternalServerError({ errors: [{ message: 'Internal Server Error: Unable to DELETE error', detail: err }] });
                });
        };
    }
}
const handlerBuilder = (aws) => {
    return middy(new ErrorsDeleteHandler(aws))
        .use(httpHeaderNormalizer())
        .use(checkApiKey())
        .use(httpErrorHandler())
        .use(bodyStringifier())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
