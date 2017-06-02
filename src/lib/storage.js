'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const aws = require('aws-sdk');
aws.config.region = config.region;
const s3 = new aws.S3({
    apiVersion: '2006-03-01'
});
const docClient = new aws.DynamoDB.DocumentClient({
    apiVersion: '2012-08-10',
    region: config.region
});

const storage = {
    putObject: (params) => {
        return s3.putObject(params).promise();
    },
    getObject: (params) => {
        return s3.getObject(params).promise();
    },
    getSignedUrl: (params) => {
        return s3.getSignedUrl('getObject', params);
    },
    listObjects: (params) => {
        return s3.listObjectsV2(params).promise();
    },
    deleteObjects: (params) => {
        return s3.deleteObjects(params).promise();
    },
    recursiveDeleteObjects: (params) => {
        return storage.listObjects(params)
            .then((data) => {
                if (data.Contents.length == 0) {
                    return Promise.resolve();
                }
                let deleteParams = {Bucket: params.Bucket};
                deleteParams.Delete = {Objects:[]};
                data.Contents.forEach(function(content) {
                    deleteParams.Delete.Objects.push({Key: content.Key});
                });
                return storage.deleteObjects(deleteParams);
            })
            .then((data) => {
                if (data && data.Deleted.length == 1000) {
                    return storage.recursiveDeleteObjects(params);
                }
                return Promise.resolve();
            });
    },
    updateDoc: (params) => {
        return docClient.update(params).promise();
    },
    deleteDoc: (params) => {
        return docClient.delete(params).promise();
    },
    queryDoc: (params) => {
        return docClient.query(params).promise();
    }
};

module.exports = storage;
