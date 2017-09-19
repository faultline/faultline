'use strict';

const console = require('console');
const resgen = require('../lib/resgen');
const checkApiKey = require('../lib/check_api_key');
const aws = require('../lib/aws')();
const kms = aws.kms;

module.exports.encrypt = (event, context, cb) => {
    if (!process.env.FAULTLINE_MASTER_API_KEY || !process.env.FAULTLINE_USE_KMS || !process.env.FAULTLINE_KMS_KEY_ALIAS) {
        const response = resgen(412, { errors: [{ message: '412 Precondition Failed: masterApiKey' }] });
        cb(null, response);
        return;
    }
    if (!checkApiKey(event)) {
        const response = resgen(403, { errors: [{ message: '403 Forbidden' }] });
        cb(null, response);
        return;
    }
    const body = event.body;
    const keyAlias = `alias/${process.env.FAULTLINE_KMS_KEY_ALIAS}`;
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
            const response = resgen(201, { data: { encrypted: encrypted }});
            cb(null, response);
        })
        .catch((err) => {
            console.error(err);
            const response = resgen(500, { errors: [{ message: 'Unable to POST error', detail: err }] });
            cb(null, response);
        });
};
