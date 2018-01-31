'use strict';

const console = require('console');
const createError = require('http-errors');
const middy = require('middy');
const { cors, httpErrorHandler, httpHeaderNormalizer, jsonBodyParser } = require('middy/middlewares');
const moment = require('moment');
const deref = require('json-schema-deref-sync');
const truncater = require('../lib/truncater');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const { checkApiKey, bodyStringifier, bodyValidator } = require('../lib/middlewares');
const aws = new Aws();
const {
    timeunitFormat,
    bucketName,
    errorByMessageTable,
    errorByTimeunitTable,
    projectNameMaxBytes,
    rootSchema,
    callNotificationsFunctionName
} = require('../lib/constants');
const {
    createResponse,
    reversedUnixtime,
    getByteLength,
    chunkArray
} = require('../lib/functions');

const schema = deref(rootSchema).properties.error.links.find((l) => {
    return l.rel == 'create';
}).schema;

class ErrorsPostHandler extends Handler {
    constructor(aws) {
        const lambda = aws.lambda;
        return (event, context, cb) => {
            const body = event.body;
            const project = decodeURIComponent(event.pathParameters.project);

            if (project.match(/[\/\s\.]/)) {
                throw new createError.BadRequest({
                    errors: [{
                        message: 'Validation error: invalid field \'project\''
                    }]
                });
            }
            if (getByteLength(project) > projectNameMaxBytes) {
                throw new createError.BadRequest({
                    errors: [{
                        message: 'Validation error: \'project\' too long (limit: 256 bytes)'
                    }]
                });
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
                    aws.storage.putObject(occurrenceBucketParams)
                        .then(() => {
                            return Promise.all([
                                aws.storage.updateDoc(docByTimeunitParams),
                                aws.storage.updateDoc(docParams),
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
                    const response = createResponse(201, {
                        data: {
                            errors: { postCount: res.length }
                        }
                    });
                    cb(null, response);
                    return res;
                })
                .then((res) => {
                    if (!notifications || notifications.length === 0) {
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
                    throw new createError.InternalServerError({ errors: [{ message: 'Internal Server Error: Unable to POST error', detail: err }] });
                });
        };
    }
}
const handlerBuilder = (aws) => {
    return middy(new ErrorsPostHandler(aws))
        .use(httpHeaderNormalizer())
        .use(checkApiKey({ allowClientKey: true }))
        .use(jsonBodyParser())
        .use(bodyValidator(schema))
        .use(httpErrorHandler())
        .use(bodyStringifier())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
