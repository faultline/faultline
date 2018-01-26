'use strict';

const console = require('console');
const storage = require('../../lib/storage');
const truncater = require('../../lib/truncater');
const aws = require('../../lib/aws')();
const moment = require('moment');
const deref = require('json-schema-deref-sync');
const Ajv = require('ajv');
const {
    timeunitFormat,
    bucketName,
    errorByMessageTable,
    errorByTimeunitTable,
    projectNameMaxBytes,
    rootSchema,
    callNotificationsFunctionName
} = require('../../lib/constants');
const {
    resgen,
    checkApiKey,
    reversedUnixtime,
    getByteLength,
    chunkArray
} = require('../../lib/functions');

const ajv = new Ajv();
const schema = deref(rootSchema).properties.error.links.find((l) => {
    return l.rel == 'create';
}).schema;

const lambda = aws.lambda;

module.exports.post = (event, context, cb) => {
    // Check faultline API Key
    if (!checkApiKey(event, true)) {
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

    const project = decodeURIComponent(event.pathParameters.project);

    if (project.match(/[\/\s\.]/)) {
        const response = resgen(400, {
            errors: [{
                message: 'Validation error: invalid field \'project\''
            }]
        });
        cb(null, response);
        return;
    }
    if (getByteLength(project) > projectNameMaxBytes) {
        const response = resgen(400, {
            errors: [{
                message: 'Validation error: \'project\' too long (limit: 256 bytes)'
            }]
        });
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
        const truncatedMessage = truncater.truncateMessage(message);
        const type = e.type;
        const key = [project, truncatedMessage].join('##');
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

        // Put projects/{project name}/errors/{error message}/occurrences/{reverse epoch id}.json
        const unixtime = moment(timestamp).unix();
        const filename = reversedUnixtime(unixtime) + '.json';
        const occurrenceBucketKey = ['projects', project, 'errors', truncatedMessage, 'occurrences', filename].join('/');
        const occurrenceBucketParams = {
            Bucket: bucketName,
            Key: occurrenceBucketKey,
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
                ':message':truncatedMessage,
                ':type':type,
                ':val':1
            },
            ReturnValues:'ALL_NEW'
        };

        const docParams = {
            TableName: errorByMessageTable,
            Key: {
                'project':project,
                'message':truncatedMessage
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
            storage.putObject(occurrenceBucketParams)
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
            const response = resgen(201, {
                data: {
                    errors: { postCount: res.length }
                }
            });
            cb(null, response);
            return res;
        })
        .catch((err) => {
            const response = resgen(500, { errors: [{ message: 'Unable to POST error', detail: err }] });
            cb(null, response);
        })
        .then((res) => {
            if (!notifications) {
                return;
            }
            let slimed = res.map((e) => {
                return {
                    counts: [
                        e.results[0].Attributes.count, // res
                        e.results[1].Attributes.count, // resByTimeunit
                    ],
                    detail: e.detail
                };
            });
            const chunkBytes = 128000 - getByteLength(JSON.stringify({
                notifications: notifications,
                res: ''
            }));
            chunkArray(slimed, chunkBytes).forEach((c) => {
                lambda.invoke({
                    FunctionName: callNotificationsFunctionName,
                    InvocationType: 'Event',
                    Payload: JSON.stringify({
                        notifications: notifications,
                        res: c
                    })
                }).promise().then(() => {
                }).catch((err) => {
                    console.error(err);
                });
            });
        })
        .catch((err) => {
            cb(new Error('Unable to notify error. Error JSON:', JSON.stringify(err, null, 2)));
        });
};
