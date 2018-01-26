'use strict';

const console = require('console');
const storage = require('../../lib/storage');
const {
    bucketName,
    errorByMessageTable,
    errorByTimeunitTable
} = require('../../lib/constants');
const {
    resgen,
    checkApiKey
} = require('../../lib/functions');

module.exports.delete = (event, context, cb) => {
    // Check faultline API Key
    if (!checkApiKey(event)) {
        const response = resgen(403, { errors: [{ message: '403 Forbidden' }] });
        cb(null, response);
        return;
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

            return storage.recursiveDeleteObjects(bucketParams);
        })
        .then(() => {
            const response = resgen(204, null);
            cb(null, response);
            return;
        })
        .catch((err) => {
            console.error(err);
            const response = resgen(500, { errors: [{ message: 'Unable to DELETE error', detail: err }] });
            cb(null, response);
        });
};
