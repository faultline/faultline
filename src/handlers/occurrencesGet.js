'use strict';

const console = require('console');
const storage = require('../lib/storage');
const {
    bucketName
} = require('../lib/constants');
const {
    resgen,
    checkApiKey
} = require('../lib/functions');

module.exports.handler = (event, context, cb) => {
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

    storage.getObject(bucketParams)
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
