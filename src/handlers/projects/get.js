'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const resgen = require('../../lib/resgen');
const storage = require('../../lib/storage');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../../config.yml', 'utf8'));
const bucketName = config.s3BucketName;

module.exports.list = (event, context, cb) => {
    if (config.apiKey) {
        // Check faultline API Key
        if (!event.headers.hasOwnProperty('x-api-key') || event.headers['x-api-key'] != config.apiKey) {
            const response = resgen(403, { status: 'error', message: '403 Forbidden'});
            cb(null, response);
            return;
        }
    }

    const params = {
        Bucket: bucketName,
        Delimiter: '/',
        EncodingType: 'url',
        Prefix: 'projects/'
    };

    storage.listObjects(params)
        .then((data) => {
            const projects = data.CommonPrefixes.map((prefix) => {
                return { name: prefix.Prefix.replace(/projects\/([^\/]+)\//,'$1') };
            });
            const response = resgen(200, { status: 'success', projects: projects });
            cb(null, response);
        })
        .catch((err) => {
            const response = resgen(500, { status: 'error', message: 'Unable to get projects', data: err });
            cb(null, response);
        });
};
