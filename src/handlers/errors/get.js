'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const resgen = require('../../lib/resgen');
const storage = require('../../lib/storage');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../../config.yml', 'utf8'));
const checkApiKey = require('../../lib/check_api_key');
const moment = require('moment');
const bucketName = config.s3BucketName;
const errorByMessageTable = config.dynamodbTablePrefix + 'Error';
const errorByTimeunitTable = config.dynamodbTablePrefix + 'ErrorByTimeunit';

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
    const status = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('status') ? event.queryStringParameters.status : null;

    let params = {
        TableName: errorByMessageTable,
        KeyConditionExpression: '#project = :project',
        ExpressionAttributeNames:{
            '#project':'project'
        },
        ExpressionAttributeValues: {
            ':project':project
        }
    };
    if (status) {
        params = {
            TableName: errorByMessageTable,
            IndexName: 'FaultlineProjectAndStatus',
            KeyConditionExpression: '#project = :project AND #status = :status',
            ExpressionAttributeNames:{
                '#project':'project',
                '#status':'status'
            },
            ExpressionAttributeValues: {
                ':project':project,
                ':status':status
            }
        };
    }

    storage.queryDoc(params)
        .then((data) => {
            const response = resgen(200, {
                status: 'success',
                errors: data.Items,
                count: data.ScannedCount
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
    const start = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('start') ? event.queryStringParameters.start : moment().startOf('month').format();
    const end = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('end') ? event.queryStringParameters.end : moment().endOf('month').format();

    const key = [project, message].join('##');

    // Get _meta/projects/project/message/[project-message].json
    const metaFilename = [project, message].join('-').replace('/','-') + '.json';
    const metaBucketKey = ['_meta', 'projects', project, message, metaFilename].join('/');
    const metaBucketParams = {
        Bucket: bucketName,
        Key: metaBucketKey
    };

    const docParams = {
        TableName: errorByTimeunitTable,
        KeyConditionExpression: '#key = :key AND #timestamp BETWEEN :from AND :to',
        ExpressionAttributeNames:{
            '#key':'key',
            '#timestamp':'timestamp'
        },
        ExpressionAttributeValues: {
            ':key':key,
            ':from':moment(start, moment.ISO_8601).format(),
            ':to':moment(end, moment.ISO_8601).format()
        }
    };

    Promise.resolve()
        .then(() => {
            return Promise.all([
                storage.getObject(metaBucketParams),
                storage.queryDoc(docParams),
            ]);
        })
        .then((data) => {
            const response = resgen(200, {
                status: 'success',
                meta: JSON.parse(data[0].Body.toString()),
                timeline: {
                    errors: data[1].Items,
                    count: data[1].Count,
                    scannedCount: data[1].ScannedCount
                }
            });
            cb(null, response);
        })
        .catch((err) => {
            const response = resgen(500, { status: 'error', message: 'Unable to query', data: err });
            cb(null, response);
        });
};
