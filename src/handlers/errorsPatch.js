'use strict';

const console = require('console');
const createError = require('http-errors');
const middy = require('middy');
const { cors, httpErrorHandler } = require('middy/middlewares');
const moment = require('moment');
const deref = require('json-schema-deref-sync');
const Ajv = require('ajv');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const { checkApiKey, bodyStringifier } = require('../lib/middlewares');
const aws = new Aws();
const {
    errorByMessageTable,
    rootSchema
} = require('../lib/constants');
const {
    createResponse
} = require('../lib/functions');

const ajv = new Ajv();
const schema = deref(rootSchema).properties.error.links.find((l) => {
    return l.rel == 'update';
}).schema;

class ErrorsPatchHandler extends Handler {
    constructor(aws) {
        return (event, context, cb) => {
            const body = JSON.parse(event.body);
            const valid = ajv.validate(schema, body);
            if (!valid) {
                throw new createError.BadRequest({
                    errors: ajv.errors.map((v) => {
                        let e = {
                            message: v.message,
                            detail: v
                        };
                        if (v.hasOwnProperty('dataPath')) {
                            e['path'] = v.dataPath.split(/[\.\[\]]/).filter((v) => { return v !== ''; });
                        }
                        return e;
                    })
                });
            }

            const status = body.status;
            const project = decodeURIComponent(event.pathParameters.project);
            const message = decodeURIComponent(event.pathParameters.message);
            const now = moment().format();

            const docParams = {
                TableName: errorByMessageTable,
                Key: {
                    'project':project,
                    'message':message
                },
                UpdateExpression: 'SET #status=:status, #lastUpdated=:lastUpdated',
                ExpressionAttributeNames:{
                    '#status':'status',
                    '#lastUpdated':'lastUpdated'
                },
                ExpressionAttributeValues:{
                    ':status':status,
                    ':lastUpdated':now
                },
                ReturnValues:'ALL_NEW'
            };

            aws.storage.updateDoc(docParams)
                .then((data) => {
                    const response = createResponse(200, {
                        data: {
                            error: data.Attributes
                        }
                    });
                    cb(null, response);
                })
                .catch((err) => {
                    console.error(err);
                    throw new createError.InternalServerError({ errors: [{ message: 'Internal Server Error: Unable to PATCH error', detail: err }] });
                });
        };
    }
}
const handlerBuilder = (aws) => {
    return middy(new ErrorsPatchHandler(aws))
        .use(checkApiKey())
        .use(httpErrorHandler())
        .use(bodyStringifier())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
