'use strict';

const console = require('console');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const aws = new Aws();
const {
    errorByMessageTable
} = require('../lib/constants');
const {
    resgen,
    checkApiKey
} = require('../lib/functions');

class ErrorsListHandler extends Handler {
    constructor(aws) {
        return (event, context, cb) => {
            // Check faultline API Key
            if (!checkApiKey(event)) {
                const response = resgen(403, { errors: [{ message: '403 Forbidden' }] });
                cb(null, response);
                return;
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

            aws.storage.queryDoc(params)
                .then((data) => {
                    const response = resgen(200, {
                        data: {
                            errors: data.Items,
                            scannedCount: data.ScannedCount
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
module.exports.ErrorsListHandler = ErrorsListHandler;

module.exports.handler = new ErrorsListHandler(aws);
