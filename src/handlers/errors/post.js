'use strict';

const timestampFormat = 'YYYY-MM-DDTHH:mm:ssZ'; // ISO8601
const yaml = require('js-yaml');
const fs = require('fs');
const resgen = require('../../lib/resgen');
const storage = require('../../lib/storage');
const timeunits = require('../../lib/timeunits');
const slack = require('../../lib/slack');
const github = require('../../lib/github');
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

module.exports.post = (event, context, cb) => {
    if (config.apiKey || config.clientApiKey) {
        // Check faultline API Key
        if (!event.headers.hasOwnProperty('x-api-key')
            || (event.headers['x-api-key'] != config.apiKey && event.headers['x-api-key'] != config.clientApiKey)) {
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

    const now = moment().format(timestampFormat);
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
        const byTimeunit = moment(moment(timestamp).format(timeunitFormat), timeunitFormat).format(timestampFormat);
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
            notifications.forEach((n) => {
                let notifier = null;
                if (n.type == 'slack') {
                    notifier = slack;
                } else if (n.type == 'github') {
                    notifier = github;
                } else {
                    return;
                }
                res.forEach((e) => {
                    const resByTimeunit = e.results[0].Attributes;
                    const res = e.results[1].Attributes;
                    let notifyInterval = n.notifyInterval ? n.notifyInterval : 1;
                    let threshold = n.threshold ? n.threshold : 1;
                    if (res.count == 1) {
                        // first notify
                        notifier.call(null, n, e.detail);
                    } else if (threshold < 0) {
                        return;
                    } else if (resByTimeunit.count >= threshold
                               && (resByTimeunit.count % notifyInterval) == 0) {
                        notifier.call(null, n, e.detail);
                    }
                });
            });
        })
        .catch((err) => {
            cb(new Error('Unable to notify error. Error JSON:', JSON.stringify(err, null, 2)));
        });
};
