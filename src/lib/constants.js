'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const rootSchema = require('../../schema.json');
const serverlessConfig = yaml.safeLoad(fs.readFileSync(__dirname + '/../../serverless.yml', 'utf8'));

const timeunits = {
    year: 'YYYY',
    month: 'YYYY-MM',
    day: 'YYYY-MM-DD',
    hour: 'YYYY-MM-DD HH',
    minute: 'YYYY-MM-DD HH:mm'
};

module.exports = {
    timeunits: timeunits,
    timeunitFormat: timeunits[process.env.FAULTLINE_TIMEUNIT],
    bucketName: process.env.FAULTLINE_S3_BUCKET_NAME,
    errorByMessageTable: `${process.env.FAULTLINE_DYNAMODB_TABLE_PREFIX}Error${process.env.FAULTLINE_DYNAMODB_TABLE_SUFFIX}`,
    errorByTimeunitTable: `${process.env.FAULTLINE_DYNAMODB_TABLE_PREFIX}ErrorByTimeunit${process.env.FAULTLINE_DYNAMODB_TABLE_SUFFIX}`,
    errorDataRetentionInDays: process.env.FAULTLINE_ERROR_DATA_RETENTION_IN_DAYS,
    errorsDeleteFunctionName: [process.env.FAULTLINE_SERVICE_NAME, process.env.FAULTLINE_STAGE, 'errorsDelete'].join('-'),
    callNotificationsFunctionName: [process.env.FAULTLINE_SERVICE_NAME, process.env.FAULTLINE_STAGE, 'callNotifications'].join('-'),
    projectNameMaxBytes: 256,
    rootSchema: rootSchema,
    serverlessConfig: serverlessConfig
};
