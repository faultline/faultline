'use strict';

const console = require('console');
const createError = require('http-errors');
const middy = require('middy');
const { cors, httpErrorHandler, httpHeaderNormalizer } = require('middy/middlewares');
const moment = require('moment');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const { checkApiKey, bodyStringifier } = require('../lib/middlewares');
const aws = new Aws();
const {
    bucketName,
    errorByTimeunitTable
} = require('../lib/constants');
const {
    createResponse
} = require('../lib/functions');

class ErrorsGetHandler extends Handler {
    constructor(aws) {
        return (event, context, cb) => {
            const project = decodeURIComponent(event.pathParameters.project);
            const message = decodeURIComponent(event.pathParameters.message);
            const start = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('start') ? event.queryStringParameters.start : moment().startOf('month').format();
            const end = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('end') ? event.queryStringParameters.end : moment().endOf('month').format();

            const key = [project, message].join('##');

            const occurrencePrefix = ['projects', project, 'errors', message, 'occurrences'].join('/') + '/';
            const occurrencesDirParams = {
                Bucket: bucketName,
                Delimiter: '/',
                Prefix: occurrencePrefix,
                MaxKeys: 1
            };

            const docParams = {
                TableName: errorByTimeunitTable,
                KeyConditionExpression: '#key = :key AND #timestamp BETWEEN :from AND :to',
                ExpressionAttributeNames:{
                    '#key':'key',
                    '#timestamp':'timestamp'
                },
                ExpressionAttributeValues: {
                    ':key':key,
                    ':from':moment(start, moment.ISO_8601).format(),
                    ':to':moment(end, moment.ISO_8601).format()
                }
            };

            aws.storage.listObjects(occurrencesDirParams)
                .then((data) => {
                    const occurrenceParams = {
                        Bucket: bucketName,
                        Key: data.Contents[0].Key
                    };
                    return Promise.all([
                        aws.storage.getObject(occurrenceParams),
                        aws.storage.queryDoc(docParams),
                    ]);
                })
                .then((data) => {
                    const response = createResponse(200, {
                        data: {
                            error: JSON.parse(data[0].Body.toString()),
                            timeline: {
                                errors: data[1].Items,
                                totalCount: data[1].Count,
                                scannedCount: data[1].ScannedCount
                            }
                        }
                    });
                    cb(null, response);
                })
                .catch((err) => {
                    console.error(err);
                    throw new createError.InternalServerError({ errors: [{ message: 'Internal Server Error: Unable to GET error', detail: err }] });
                });
        };
    }
}
const handlerBuilder = (aws) => {
    return middy(new ErrorsGetHandler(aws))
        .use(httpHeaderNormalizer())
        .use(checkApiKey())
        .use(httpErrorHandler())
        .use(bodyStringifier())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
