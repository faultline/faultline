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
                    const response = resgen(200, {
                        data: {
                            projects: projects
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
    return middy(new ProjectsListHandler(aws))
        .use(checkApiKeyMiddleware())
        .use(httpErrorHandler())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
