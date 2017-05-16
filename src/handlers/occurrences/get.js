'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const resgen = require('../../lib/resgen');
const storage = require('../../lib/storage');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../../config.yml', 'utf8'));
const checkApiKey = require('../../lib/check_api_key');
const reversedUnixtime = require('../../lib/reversed_unixtime');
const moment = require('moment');
const bucketName = config.s3BucketName;

module.exports.list = (event, context, cb) => {
    if (config.apiKey) {
        // Check faultline API Key
        if (!checkApiKey(event)) {
            const response = resgen(403, { status: 'error', message: '403 Forbidden'});
            cb(null, response);
            return;
        }
    }

    const project = decodeURIComponent(event.pathParameters.project);
    const message = decodeURIComponent(event.pathParameters.message);

    const occurrencePrefix = ['projects', project, 'errors', message, 'occurrences'].join('/') + '/';
    const occurrencesDirParams = {
        Bucket: bucketName,
        Delimiter: '/',
        Prefix: occurrencePrefix,
        MaxKeys: 10
    };

    storage.listObjects(occurrencesDirParams)
        .then((data) => {
            const promisses = data.Contents.map((obj) => {
                const objectParams = {
                    Bucket: bucketName,
                    Key: obj.Key
                };
                return storage.getObject(objectParams);
            });
            return Promise.all(promisses);
        })
        .then((data) => {
            const occurrences = data.map((obj) => {
                let parsed = JSON.parse(obj.Body.toString());
                const unixtime = moment(parsed.timestamp).format('X');
                parsed.reversedUnixtime = reversedUnixtime(unixtime);
                return parsed;
            });
            const response = resgen(200, {
                status: 'success',
                occurrences: occurrences
            });
            cb(null, response);
        })
        .catch((err) => {
            const response = resgen(500, { status: 'error', message: 'Unable to query', data: err });
            cb(null, response);
        });
};

module.exports.get = (event, context, cb) => {
    if (config.apiKey) {
        // Check faultline API Key
        if (!checkApiKey(event)) {
            const response = resgen(403, { status: 'error', message: '403 Forbidden'});
            cb(null, response);
            return;
        }
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
            const response = resgen(200, {
                status: 'success',
                meta: JSON.parse(data.Body.toString())
            });
            cb(null, response);
        })
        .catch((err) => {
            const response = resgen(500, { status: 'error', message: 'Unable to query', data: err });
            cb(null, response);
        });
};
