'use strict';

const console = require('console');
const yaml = require('js-yaml');
const fs = require('fs');
const resgen = require('../lib/resgen');
const checkApiKey = require('../lib/check_api_key');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const aws = require('../lib/aws')(config);
const kms = aws.kms;

module.exports.encrypt = (event, context, cb) => {
    if (!config.masterApiKey || !config.useKms || !config.kmsKeyAlias) {
        const response = resgen(403, { status: 'error', message: '412 Precondition Failed: masterApiKey'});
        cb(null, response);
        return;
    }
    if (!checkApiKey(event, config)) {
        const response = resgen(403, { status: 'error', message: '403 Forbidden'});
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
            console.error(err);
            const response = resgen(500, { status: 'error', message: 'Unable to encrypt error'});
            cb(null, response);
        });
};
