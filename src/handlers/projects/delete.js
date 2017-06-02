'use strict';

const console = require('console');
const yaml = require('js-yaml');
const fs = require('fs');
const resgen = require('../../lib/resgen');
const storage = require('../../lib/storage');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../../config.yml', 'utf8'));
const checkApiKey = require('../../lib/check_api_key');
const bucketName = config.s3BucketName;
const errorByMessageTable = config.dynamodbTablePrefix + 'Error';
const errorByTimeunitTable = config.dynamodbTablePrefix + 'ErrorByTimeunit';

module.exports.delete = (event, context, cb) => {
    if (config.apiKey) {
        // Check faultline API Key
        if (!checkApiKey(event)) {
            const response = resgen(403, { status: 'error', message: '403 Forbidden'});
            cb(null, response);
            return;
        }
    }

    const project = decodeURIComponent(event.pathParameters.project);

    const recursiveDeleteDocByKey = (key) => {
        const limit = 500;
        const params = {
            TableName: errorByTimeunitTable,
            KeyConditionExpression: '#key = :key',
            ExpressionAttributeNames:{
                '#key':'key'
            },
            ExpressionAttributeValues: {
                ':key':key
            },
            Limit: limit
        };
        let promises = [];
        return storage.queryDoc(params)
            .then((data) => {
                const errors = data.Items;
                errors.forEach((e) => {
                    const docParams = {
                        TableName: errorByTimeunitTable,
                        Key: {
                            key:e.key,
                            timestamp:e.timestamp
                        },
                        ReturnValues:'NONE'
                    };
                    // docParams
                    promises.push(storage.deleteDoc(docParams));
                });
                return Promise.all(promises);
            })
            .then(() => {
                if (promises.length == limit) {
                    return recursiveDeleteDocByKey(key);
                }
                return Promise.resolve();
            });
    };

    const recursiveDeleteDocByProject = (project) => {
        const params = {
            TableName: errorByMessageTable,
            KeyConditionExpression: '#project = :project',
            ExpressionAttributeNames:{
                '#project':'project'
            },
            ExpressionAttributeValues: {
                ':project':project
            },
            Limit: 500
        };
        let promises = [];
        return storage.queryDoc(params)
            .then((data) => {
                const errors = data.Items;
                errors.forEach((e) => {
                    const key = [e.project, e.message].join('##');
                    promises.push(recursiveDeleteDocByKey(key));
                    const docParams = {
                        TableName: errorByMessageTable,
                        Key: {
                            project:e.project,
                            message:e.message
                        },
                        ReturnValues:'NONE'
                    };
                    promises.push(storage.deleteDoc(docParams));
                });
                return Promise.all(promises);
            })
            .then(() => {
                if (promises.length == 500) {
                    return recursiveDeleteDocByProject(project);
                }
                return Promise.resolve();
            });
    };

    recursiveDeleteDocByProject(project)
        .then(() => {
            const bucketParams = {
                Bucket: bucketName,
                Prefix: 'projects/' + project + '/'
            };
            const metaBucketParams = {
                Bucket: bucketName,
                Prefix: '_meta/projects/' + project + '/'
            };

            return Promise.all([
                storage.recursiveDeleteObjects(bucketParams),
                storage.recursiveDeleteObjects(metaBucketParams),
            ]);
        })
        .then(() => {
            const response = resgen(204, null);
            cb(null, response);
            return;
        })
        .catch((err) => {
            console.error(err);
            const response = resgen(500, { status: 'error', message: 'Unable to delete', data: err });
            cb(null, response);
        });
};
