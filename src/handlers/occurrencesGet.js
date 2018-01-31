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
    bucketName
} = require('../lib/constants');
const {
    createResponse
} = require('../lib/functions');

class OccurrencesGetHandler extends Handler {
    constructor(aws) {
        return (event, context, cb) => {
            const project = decodeURIComponent(event.pathParameters.project);
            const message = decodeURIComponent(event.pathParameters.message);
            const reversedUnixtime = decodeURIComponent(event.pathParameters.reversedUnixtime);

            const filename = reversedUnixtime + '.json';
            const bucketKey = ['projects', project, 'errors', message, 'occurrences', filename].join('/');
            const bucketParams = {
                Bucket: bucketName,
                Key: bucketKey
            };

            aws.storage.getObject(bucketParams)
                .then((data) => {
                    let parsed = JSON.parse(data.Body.toString());
                    parsed.reversedUnixtime = reversedUnixtime;
                    const response = createResponse(200, {
                        data: {
                            error: parsed
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
    return middy(new OccurrencesGetHandler(aws))
        .use(httpHeaderNormalizer())
        .use(checkApiKey())
        .use(httpErrorHandler())
        .use(bodyStringifier())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
