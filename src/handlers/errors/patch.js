'use strict';

const console = require('console');
const resgen = require('../../lib/resgen');
const storage = require('../../lib/storage');
const checkApiKey = require('../../lib/check_api_key');
const moment = require('moment');

const deref = require('json-schema-deref-sync');
const Ajv = require('ajv');
const ajv = new Ajv();
const rootSchema = require('./../../../schema.json');
const schema = deref(rootSchema).properties.error.links.find((l) => {
    return l.rel == 'update';
}).schema;
const errorByMessageTable = process.env.FAULTLINE_DYNAMODB_TABLE_PREFIX + 'Error';

module.exports.patch = (event, context, cb) => {
    // Check faultline API Key
    if (!checkApiKey(event)) {
        const response = resgen(403, { errors: [{ message: '403 Forbidden' }] });
        cb(null, response);
        return;
    }

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

    storage.updateDoc(docParams)
        .then((data) => {
            const response = {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    status: 'success', meta: data
                })
            };
            cb(null, response);
        })
        .catch((err) => {
            console.error(err);
            const response = resgen(500, { errors: [{ message: 'Unable to PATCH error', detail: err }] });
            cb(null, response);
        });
};
