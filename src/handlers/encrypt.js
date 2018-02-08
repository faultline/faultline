'use strict';

const console = require('console');
const createError = require('http-errors');
const middy = require('middy');
const { cors, httpErrorHandler, httpHeaderNormalizer } = require('middy/middlewares');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const { checkApiKey, bodyStringifier } = require('../lib/middlewares');
const aws = new Aws();
const {
    createResponse
} = require('../lib/functions');

class EncryptHandler extends Handler {
    constructor(aws) {
        const kms = aws.kms;
        return (event, context, cb) => {
            if (!process.env.FAULTLINE_MASTER_API_KEY || Number(process.env.FAULTLINE_USE_KMS) === 0 || !process.env.FAULTLINE_KMS_KEY_ALIAS) {
                throw new createError.PreconditionFailed({ errors: [{ message: 'Precondition Failed: masterApiKey' }] });
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
                    const response = createResponse(201, { data: { encrypted: encrypted }});
                    cb(null, response);
                })
                .catch((err) => {
                    console.error(err);
                    throw new createError.InternalServerError({ errors: [{ message: 'Internal Server Error: Unable to POST error', detail: err }] });
                });
        };
    }
}
const handlerBuilder = (aws) => {
    return middy(new EncryptHandler(aws))
        .use(httpHeaderNormalizer())
        .use(checkApiKey())
        .use(httpErrorHandler())
        .use(bodyStringifier())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
