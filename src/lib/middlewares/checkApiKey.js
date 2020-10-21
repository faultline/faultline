const createError = require('http-errors');
const apiKeyHeader = 'X-Api-Key';

const middleware = (config = { allowClientKey: false }) => {
    return ({
        before: (handler, next) => {
            if (!middleware(config).checkApiKey(handler.event)) {
                throw new createError.Forbidden({ errors: [{ message: '403 Forbidden' }] });
            }
            return next();
        },
        checkApiKey: (event) => {
            if (!process.env.FAULTLINE_MASTER_API_KEY && !process.env.FAULTLINE_CLIENT_API_KEY) {
                return true;
            }
            // Check faultline API Key
            if (!event.headers.hasOwnProperty(apiKeyHeader)) {
                return false;
            }
            let checkKeys = [process.env.FAULTLINE_MASTER_API_KEY];
            if (config.allowClientKey) {
                if (process.env.FAULTLINE_CLIENT_API_KEY) {
                    process.env.FAULTLINE_CLIENT_API_KEY.split(',').forEach((key) => {
                        checkKeys.push(key.trim());
                    });
                }
            }
            if (checkKeys.indexOf(event.headers[apiKeyHeader]) < 0) {
                return false;
            }
            return true;
        }
    });
};

module.exports = middleware;
