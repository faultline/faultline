'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const aws = require('aws-sdk');
const resgen = require('../../lib/resgen');
const storage = require('../../lib/storage');
const timeunits = require('../../lib/timeunits');
const checkApiKey = require('../../lib/check_api_key');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../../config.yml', 'utf8'));
const timeunitFormat = timeunits[config.timeunit];
const moment = require('moment');

const deref = require('json-schema-deref-sync');
const Ajv = require('ajv');
const ajv = new Ajv();
const rootSchema = require('./../../../schema.json');
const schema = deref(rootSchema).properties.error.links.find((l) => {
    return l.rel == 'create';
}).schema;
const bucketName = config.s3BucketName;
const errorByMessageTable = config.dynamodbTablePrefix + 'Error';
const errorByTimeunitTable = config.dynamodbTablePrefix + 'ErrorByTimeunit';

const serverlessConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/../../../serverless.yml', 'utf8'));
const lambda = new aws.Lambda({
    region: config.region
});

module.exports.post = (event, context, cb) => {
    if (config.apiKey || config.clientApiKey) {
        // Check faultline API Key
        if (!checkApiKey(event, true)) {
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

    const project = decodeURIComponent(event.pathParameters.project);

    if (project.match(/[\/\s\.]/)) {
        const response = resgen(400, { status: 'error', message: 'Validation error: invalid field \'project\'', data: ajv.errors });
        cb(null, response);
        return;
    }

    const errors = body.errors;
    const bodyContext = body.hasOwnProperty('context') ? body.context: {};
    const environment = body.hasOwnProperty('environment') ? body.environment: {};
    const session = body.hasOwnProperty('session') ? body.session: {};
    const params = body.hasOwnProperty('params') ? body.params: {};
    const notifications = body.hasOwnProperty('notifications') ? body.notifications: [];

    const now = moment().format();
    const status = 'unresolved';
    let promises = [];

    errors.forEach((e) => {
        const message = e.message;
        const type = e.type;
        const key = [project, message].join('##');
        let timestamp = now;
        if (e.timestamp) {
            timestamp = e.timestamp;
        }
        const byTimeunit = moment(moment(timestamp).format(timeunitFormat), timeunitFormat).format();
        const errorData = {
            project: project,
            message: message,
            type: type,
            backtrace: e.backtrace,
            context: bodyContext,
            environment: environment,
            session: session,
            params: params,
            // notifications: notifications, @FIXME remove endpoint, userToken
            event: event,
            timestamp: timestamp
        };

        // Put projects/project/message/byTimeunit/[project-message-timestamp].json
        const filename = [project, message, timestamp].join('-').replace('/','-') + '.json';
        const bucketKey = ['projects', project, message, byTimeunit, filename].join('/');
        const logByTimeunitBucketParams = {
            Bucket: bucketName,
            Key: bucketKey,
            Body: JSON.stringify(errorData, null, 2),
            ContentType: 'application/json'
        };

        // Put _meta/projects/project/message/[project-message].json
        const metaFilename = [project, message].join('-').replace('/','-') + '.json';
        const metaBucketKey = ['_meta', 'projects', project, message, metaFilename].join('/');
        const metaBucketParams = {
            Bucket: bucketName,
            Key: metaBucketKey,
            Body: JSON.stringify(errorData, null, 2),
            ContentType: 'application/json'
        };

        const docByTimeunitParams = {
            TableName: errorByTimeunitTable,
            Key: {
                'key':key,
                'timestamp':byTimeunit
            },
            UpdateExpression: 'SET #project=:project, #message=:message, #type=:type ADD #count :val',
            ExpressionAttributeNames:{
                '#project':'project',
                '#message':'message',
                '#type':'type',
                '#count':'count'
            },
            ExpressionAttributeValues:{
                ':project':project,
                ':message':message,
                ':type':type,
                ':val':1
            },
            ReturnValues:'ALL_NEW'
        };

        const docParams = {
            TableName: errorByMessageTable,
            Key: {
                'project':project,
                'message':message
            },
            UpdateExpression: 'SET #type=:type, #status=:status, #lastUpdated=:lastUpdated ADD #count :val',
            ExpressionAttributeNames:{
                '#type':'type',
                '#status':'status',
                '#lastUpdated':'lastUpdated',
                '#count':'count'
            },
            ExpressionAttributeValues:{
                ':type':type,
                ':status':status,
                ':lastUpdated':now,
                ':val':1
            },
            ReturnValues:'ALL_NEW'
        };

        promises.push(
            Promise.resolve()
                .then(() => {
                    return Promise.all([
                        storage.putObject(logByTimeunitBucketParams),
                        storage.putObject(metaBucketParams),
                    ]);
                })
                .then(() => {
                    return Promise.all([
                        storage.updateDoc(docByTimeunitParams),
                        storage.updateDoc(docParams),
                    ]);
                })
                .then((docResults) => {
                    return new Promise((resolve) => {
                        resolve({
                            results:docResults,
                            detail:errorData
                        });
                    });
                }));
    });

    Promise.all(promises)
        .then((res) => {
            const response = resgen(201, { status: 'success', errors: res.length });
            cb(null, response);
            return res;
        })
        .catch((err) => {
            const response = resgen(500, { status: 'error', message: 'Unable to POST error', data: err });
            cb(null, response);
        })
        .then((res) => {
            if (!notifications) {
                return;
            }
            const functionName = serverlessConfig.functions.callNotifications.name.replace('${self:provider.stage}', serverlessConfig.provider.stage);
            lambda.invoke({
                FunctionName: functionName,
                InvocationType: 'Event',
                Payload: JSON.stringify({
                    notifications: notifications,
                    res: res
                }, null, 2)
            }, (err, res) => {
                if (err) {
                    console.log(err);
                }
            });
        })
        .catch((err) => {
            cb(new Error('Unable to notify error. Error JSON:', JSON.stringify(err, null, 2)));
        });
};
