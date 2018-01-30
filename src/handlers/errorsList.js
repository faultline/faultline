'use strict';

const console = require('console');
const middy = require('middy');
const { cors, httpErrorHandler } = require('middy/middlewares');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const checkApiKeyMiddleware = require('../lib/checkApiKeyMiddleware');
const aws = new Aws();
const {
    errorByMessageTable
} = require('../lib/constants');
const {
    resgen
} = require('../lib/functions');

class ErrorsListHandler extends Handler {
    constructor(aws) {
        return (event, context, cb) => {
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
const handlerBuilder = (aws) => {
    return middy(new ErrorsListHandler(aws))
        .use(checkApiKeyMiddleware())
        .use(httpErrorHandler())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
