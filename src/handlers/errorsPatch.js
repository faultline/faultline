'use strict';

const console = require('console');
const middy = require('middy');
const { cors, httpErrorHandler } = require('middy/middlewares');
const moment = require('moment');
const deref = require('json-schema-deref-sync');
const Ajv = require('ajv');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const checkApiKeyMiddleware = require('../lib/checkApiKeyMiddleware');
const aws = new Aws();
const {
    errorByMessageTable,
    rootSchema
} = require('../lib/constants');
const {
    resgen
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
                const response = resgen(400, {
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
                cb(null, response);
                return;
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
                    const response = resgen(200, {
                        data: {
                            error: data.Attributes
                        }
                    });
                    cb(null, response);
                })
                .catch((err) => {
                    console.error(err);
                    const response = resgen(500, { errors: [{ message: 'Unable to PATCH error', detail: err }] });
                    cb(null, response);
                });
        };
    }
}
const handlerBuilder = (aws) => {
    return middy(new ErrorsPatchHandler(aws))
        .use(checkApiKeyMiddleware())
        .use(httpErrorHandler())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
