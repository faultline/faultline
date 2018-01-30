'use strict';

const console = require('console');
const middy = require('middy');
const { cors, httpErrorHandler } = require('middy/middlewares');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const checkApiKeyMiddleware = require('../lib/checkApiKeyMiddleware');
const aws = new Aws();
const {
    bucketName
} = require('../lib/constants');
const {
    resgen
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
                    const response = resgen(200, {
                        data: {
                            error: parsed
                        }
                    });
                    cb(null, response);
                })
                .catch((err) => {
                    console.error(err);
                    const response = resgen(500, { errors: [{ message: 'Unable to GET error', detail: err }] });
                    cb(null, response);
                });
        };
    }
}
const handlerBuilder = (aws) => {
    return middy(new OccurrencesGetHandler(aws))
        .use(checkApiKeyMiddleware())
        .use(httpErrorHandler())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
