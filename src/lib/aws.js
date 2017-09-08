'use strict';

const AWS = require('aws-sdk');
const aws = () => {
    AWS.config.region = process.env.FAULTLINE_REGION;
    return {
        s3: new AWS.S3({
            apiVersion: '2006-03-01'
        }),
        docClient: new AWS.DynamoDB.DocumentClient({
            apiVersion: '2012-08-10'
        }),
        lambda: new AWS.Lambda({
            apiVersion: '2015-03-31'
        }),
        kms: new AWS.KMS({
            apiVersion: '2014-11-01'
        })
    };
};

module.exports = aws;
