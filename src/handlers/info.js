'use strict';

const createError = require('http-errors');
const middy = require('middy');
const { cors, httpErrorHandler, httpHeaderNormalizer } = require('middy/middlewares');
const Aws = require('../lib/aws');
const Handler = require('../lib/handler');
const { checkApiKey, bodyStringifier } = require('../lib/middlewares');
const aws = new Aws();
const {
    version
} = require('../lib/constants');
const {
    createResponse
} = require('../lib/functions');

class InfoHandler extends Handler {
    constructor(aws) {
        return (event, context, cb) => {
            const response = createResponse(201, { data: { version: version }});
            cb(null, response);
        };
    }
}
const handlerBuilder = (aws) => {
    return middy(new InfoHandler(aws))
        .use(httpHeaderNormalizer())
        .use(checkApiKey())
        .use(httpErrorHandler())
        .use(bodyStringifier())
        .use(cors());
};
const handler = handlerBuilder(aws);
module.exports = { handler, handlerBuilder };
