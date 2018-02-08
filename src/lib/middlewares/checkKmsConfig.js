const createError = require('http-errors');
const apiKeyHeader = 'X-Api-Key';

const middleware = () => {
    return ({
        before: (handler, next) => {
            if (!middleware().checkKmsConfig(handler.event)) {
                throw new createError.PreconditionFailed({ errors: [{ message: 'Precondition Failed: masterApiKey' }] });
            }
            return next();
        },
        checkKmsConfig: (event) => {
            if (!process.env.FAULTLINE_MASTER_API_KEY || Number(process.env.FAULTLINE_USE_KMS) === 0 || !process.env.FAULTLINE_KMS_KEY_ALIAS) {
                return false;
            }
            return true;
        }
    });
};

module.exports = middleware;
