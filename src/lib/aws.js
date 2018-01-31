'use strict';

const AWS = require('aws-sdk');
class Aws {
    constructor(resource = null) {
        AWS.config.region = process.env.FAULTLINE_REGION;
        if (resource) {
            this.s3 = resource.s3;
            this.dynamoDB = resource.dynamoDB;
            this.docClient = resource.docClient;
            this.lambda = resource.lambda;
            this.kms = resource.kms;
        } else {
            this.s3 = new AWS.S3({
                apiVersion: '2006-03-01'
            });
            this.dynamoDB = new AWS.DynamoDB({
                apiVersion: '2012-08-10'
            });
            this.docClient = new AWS.DynamoDB.DocumentClient({
                apiVersion: '2012-08-10'
            });
            this.lambda = new AWS.Lambda({
                apiVersion: '2015-03-31'
            });
            this.kms = new AWS.KMS({
                apiVersion: '2014-11-01'
            });
        }
        this.storage = this.storage();
    }
    storage() {
        const self = this;
        return {
            putObject: (params) => {
                return self.s3.putObject(params).promise();
            },
            getObject: (params) => {
                return self.s3.getObject(params).promise();
            },
            getSignedUrl: (params) => {
                return self.s3.getSignedUrl('getObject', params);
            },
            listObjects: (params) => {
                return self.s3.listObjectsV2(params).promise();
            },
            deleteObjects: (params) => {
                return self.s3.deleteObjects(params).promise();
            },
            recursiveDeleteObjects: (params) => {
                return this.storage.listObjects(params)
                    .then((data) => {
                        if (data.Contents.length == 0) {
                            return Promise.resolve();
                        }
                        let deleteParams = {Bucket: params.Bucket};
                        deleteParams.Delete = {Objects:[]};
                        data.Contents.forEach(function(content) {
                            deleteParams.Delete.Objects.push({Key: content.Key});
                        });
                        return this.storage.deleteObjects(deleteParams);
                    })
                    .then((data) => {
                        if (data && data.Deleted.length == 1000) {
                            return this.storage.recursiveDeleteObjects(params);
                        }
                        return Promise.resolve();
                    });
            },
            updateDoc: (params) => {
                return self.docClient.update(params).promise();
            },
            deleteDoc: (params) => {
                return self.docClient.delete(params).promise();
            },
            queryDoc: (params) => {
                return self.docClient.query(params).promise();
            }
        };
    }
}

module.exports = Aws;
