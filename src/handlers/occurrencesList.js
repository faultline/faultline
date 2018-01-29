'use strict';

const moment = require('moment');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const aws = new Aws();

const {
    bucketName
} = require('../lib/constants');
const {
    resgen,
    checkApiKey,
    reversedUnixtime
} = require('../lib/functions');

class OccurrencesListHandler extends Handler {
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
                    const response = resgen(200, {
                        data: {
                            errors: occurrences,
                            totalCount: occurrences.length
                        }
                    });
                    cb(null, response);
                })
                .catch((err) => {
                    const response = resgen(500, { errors: [{ message: 'Unable to GET error', detail: err }] });
                    cb(null, response);
                });
        };
    }
}
module.exports.OccurrencesListHandler = OccurrencesListHandler;

module.exports.handler = new OccurrencesListHandler(aws);
