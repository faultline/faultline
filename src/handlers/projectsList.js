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

class ProjectsListHandler extends Handler {
    constructor(aws) {
        return (event, context, cb) => {
            const params = {
                Bucket: bucketName,
                Delimiter: '/',
                EncodingType: 'url',
                Prefix: 'projects/'
            };

            aws.storage.listObjects(params)
                .then((data) => {
                    const projects = data.CommonPrefixes.map((prefix) => {
                        return { name: decodeURIComponent(prefix.Prefix.replace(/projects\/([^\/]+)\//,'$1')) };
                    });
                    const response = createResponse(200, {
                        data: {
                            projects: projects
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
    return middy(new ProjectsListHandler(aws))
        .use(httpHeaderNormalizer())
        .use(checkApiKey())
        .use(httpErrorHandler())
        .use(bodyStringifier())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
