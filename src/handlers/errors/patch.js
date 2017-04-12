'use strict';

const timestampFormat = 'YYYY-MM-DDTHH:mm:ssZ'; // ISO8601
const yaml = require('js-yaml');
const fs = require('fs');
const resgen = require('../../lib/resgen');
const storage = require('../../lib/storage');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../../config.yml', 'utf8'));
const checkApiKey = require('../../lib/check_api_key');
const moment = require('moment');

const deref = require('json-schema-deref-sync');
const Ajv = require('ajv');
const ajv = new Ajv();
const rootSchema = require('./../../../schema.json');
const schema = deref(rootSchema).properties.error.links.find((l) => {
    return l.rel == 'update';
}).schema;
const errorByMessageTable = config.dynamodbTablePrefix + 'Error';

module.exports.patch = (event, context, cb) => {
    if (config.apiKey) {
        // Check faultline API Key
        if (!checkApiKey(event)) {
            const response = resgen(403, { status: 'error', message: '403 Forbidden'});
            cb(null, response);
            return;
        }
    }

    const body = JSON.parse(event.body);
    const valid = ajv.validate(schema, body);
    if (!valid) {
        const response = resgen(400, { status: 'error', message: 'JSON Schema Error', data: ajv.errors });
        cb(null, response);
        return;
    }

    const status = body.status;
    const project = decodeURIComponent(event.pathParameters.project);
    const message = decodeURIComponent(event.pathParameters.message);
    const now = moment().format(timestampFormat);

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
            const response = resgen(500, { status: 'error', message: 'Unable to POST error', data: err });
            cb(null, response);
        });
};
