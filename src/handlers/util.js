'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const aws = require('aws-sdk');
const resgen = require('../lib/resgen');
const checkApiKey = require('../lib/check_api_key');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const kms = new aws.KMS({
    region: config.region
});

module.exports.encrypt = (event, context, cb) => {
    if (config.apiKey) {
        // Check faultline API Key
        if (!checkApiKey(event)) {
            const response = resgen(403, { status: 'error', message: '403 Forbidden'});
            cb(null, response);
            return;
        }
    } else {
        const response = resgen(403, { status: 'error', message: '412 Precondition Failed: apiKey'});
        cb(null, response);
        return;
    }
    if (!config.useKms || !config.kmsKeyAlias) {
        const response = resgen(403, { status: 'error', message: '412 Precondition Failed: useKms kmsKeyAlias'});
        cb(null, response);
        return;
    }
    const body = event.body;
    const keyAlias = `alias/${config.kmsKeyAlias}`;
    kms.listAliases().promise()
        .then((res) => {
            const key = res.Aliases.find((k) => {
                return (k.AliasName == keyAlias);
            });
            const keyId = key.TargetKeyId;
            return kms.encrypt({
                KeyId: keyId,
                Plaintext: body
            }).promise();
        })
        .then((res) => {
            const encrypted = res.CiphertextBlob.toString('base64');
            const response = resgen(201, { status: 'success', encrypted: encrypted });
            cb(null, response);
        })
        .catch((err) => {
            console.log(err);
            const response = resgen(500, { status: 'error', message: 'Unable to encrypt error'});
            cb(null, response);
        });
};
