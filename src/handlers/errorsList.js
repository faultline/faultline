'use strict';

const console = require('console');
const createError = require('http-errors');
const middy = require('middy');
const { cors, httpErrorHandler, httpHeaderNormalizer } = require('middy/middlewares');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const { checkApiKey, bodyStringifier } = require('../lib/middlewares');
const aws = new Aws();
const {
    errorByMessageTable
} = require('../lib/constants');
const {
    createResponse
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
                    const response = createResponse(200, {
                        data: {
                            errors: data.Items,
                            scannedCount: data.ScannedCount
                        }
                    });
                    cb(null, response);
                })
                .catch((err) => {
                    console.error(err);
                    throw new createError.InternalServerError({ errors: [{ message: 'Internal Server Error: Unable to GET error', detail: err }] });
                });
        };

    }
}
const handlerBuilder = (aws) => {
    return middy(new ErrorsListHandler(aws))
        .use(httpHeaderNormalizer())
        .use(checkApiKey())
        .use(httpErrorHandler())
        .use(bodyStringifier())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
