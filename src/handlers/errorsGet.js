'use strict';

const console = require('console');
const storage = require('../lib/storage');
const moment = require('moment');
const {
    bucketName,
    errorByTimeunitTable
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
    const start = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('start') ? event.queryStringParameters.start : moment().startOf('month').format();
    const end = event.queryStringParameters && event.queryStringParameters.hasOwnProperty('end') ? event.queryStringParameters.end : moment().endOf('month').format();

    const key = [project, message].join('##');

    const occurrencePrefix = ['projects', project, 'errors', message, 'occurrences'].join('/') + '/';
    const occurrencesDirParams = {
        Bucket: bucketName,
        Delimiter: '/',
        Prefix: occurrencePrefix,
        MaxKeys: 1
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

    storage.listObjects(occurrencesDirParams)
        .then((data) => {
            const occurrenceParams = {
                Bucket: bucketName,
                Key: data.Contents[0].Key
            };
            return Promise.all([
                storage.getObject(occurrenceParams),
                storage.queryDoc(docParams),
            ]);
        })
        .then((data) => {
            const response = resgen(200, {
                data: {
                    error: JSON.parse(data[0].Body.toString()),
                    timeline: {
                        errors: data[1].Items,
                        totalCount: data[1].Count,
                        scannedCount: data[1].ScannedCount
                    }
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
