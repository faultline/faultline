'use strict';

const console = require('console');
const storage = require('../../lib/storage');
const {
    bucketName
} = require('../../lib/constants');
const {
    resgen,
    checkApiKey
} = require('../../lib/functions');

module.exports.list = (event, context, cb) => {
    // Check faultline API Key
    if (!checkApiKey(event)) {
        const response = resgen(403, { errors: [{ message: '403 Forbidden' }] });
        cb(null, response);
        return;
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
