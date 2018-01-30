'use strict';

const console = require('console');
const middy = require('middy');
const { cors, httpErrorHandler } = require('middy/middlewares');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const checkApiKeyMiddleware = require('../lib/checkApiKeyMiddleware');
const aws = new Aws();
const {
    resgen
} = require('../lib/functions');

class EncryptHandler extends Handler {
    constructor(aws) {
        const kms = aws.kms;
        return (event, context, cb) => {
            if (!process.env.FAULTLINE_MASTER_API_KEY || !process.env.FAULTLINE_USE_KMS || !process.env.FAULTLINE_KMS_KEY_ALIAS) {
                const response = resgen(412, { errors: [{ message: '412 Precondition Failed: masterApiKey' }] });
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
    }
}
const handlerBuilder = (aws) => {
    return middy(new EncryptHandler(aws))
        .use(checkApiKeyMiddleware())
        .use(httpErrorHandler())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
