'use strict';

const createError = require('http-errors');
const middy = require('middy');
const { cors, httpErrorHandler, httpHeaderNormalizer } = require('middy/middlewares');
const moment = require('moment');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const { checkApiKey, bodyStringifier } = require('../lib/middlewares');
const aws = new Aws();

const {
    bucketName
} = require('../lib/constants');
const {
    createResponse,
    reversedUnixtime
} = require('../lib/functions');

class OccurrencesListHandler extends Handler {
    constructor(aws) {
        return (event, context, cb) => {
            const project = decodeURIComponent(event.pathParameters.project);
            const message = decodeURIComponent(event.pathParameters.message);
            const limit = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('limit') ? event.queryStringParameters.limit : 10;
            const after = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('after') ? event.queryStringParameters.after : null;

            const startAfter = after ? ['projects', project, 'errors', message, 'occurrences'].join('/') + '/' + after + '.json' : null;

            const occurrencePrefix = ['projects', project, 'errors', message, 'occurrences'].join('/') + '/';
            const occurrencesDirParams = {
                Bucket: bucketName,
                Delimiter: '/',
                Prefix: occurrencePrefix,
                MaxKeys: limit,
                StartAfter: startAfter
            };

            aws.storage.listObjects(occurrencesDirParams)
                .then((data) => {
                    const promisses = data.Contents.map((obj) => {
                        const objectParams = {
                            Bucket: bucketName,
                            Key: obj.Key
                        };
                        return aws.storage.getObject(objectParams);
                    });
                    return Promise.all(promisses);
                })
                .then((data) => {
                    const occurrences = data.map((obj) => {
                        let parsed = JSON.parse(obj.Body.toString());
                        const unixtime = moment(parsed.timestamp).unix();
                        parsed.reversedUnixtime = reversedUnixtime(unixtime);
                        return parsed;
                    });
                    const response = createResponse(200, {
                        data: {
                            errors: occurrences,
                            totalCount: occurrences.length
                        }
                    });
                    cb(null, response);
                })
                .catch((err) => {
                    throw new createError.InternalServerError({ errors: [{ message: 'Internal Server Error: Unable to GET error', detail: err }] });
                });
        };
    }
}
const handlerBuilder = (aws) => {
    return middy(new OccurrencesListHandler(aws))
        .use(httpHeaderNormalizer())
        .use(checkApiKey())
        .use(httpErrorHandler())
        .use(bodyStringifier())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
