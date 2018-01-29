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

class ProjectsListHandler extends Handler {
    constructor(aws) {
        return (event, context, cb) => {
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
module.exports.ProjectsListHandler = ProjectsListHandler;

module.exports.handler = new ProjectsListHandler(aws);
