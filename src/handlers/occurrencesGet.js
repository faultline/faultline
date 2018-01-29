'use strict';

const console = require('console');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const aws = new Aws();
const {
    bucketName
} = require('../lib/constants');
const {
    resgen,
    checkApiKey
} = require('../lib/functions');

class OccurrencesGetHandler extends Handler {
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

module.exports.OccurrencesGetHandler = OccurrencesGetHandler;

module.exports.handler = new OccurrencesGetHandler(aws);
