'use strict';

module.exports = (event, allowClientKey = false) => {
    if (!process.env.FAULTLINE_MASTER_API_KEY && !process.env.FAULTLINE_CLIENT_API_KEY) {
        return true;
    }
    // Check faultline API Key
    let apiKeyHeader = 'X-Api-Key';
    if (event.headers.hasOwnProperty('x-api-key')) {
        apiKeyHeader = 'x-api-key';
    }
    if (!event.headers.hasOwnProperty(apiKeyHeader)) {
        return false;
    }
    let checkKeys = [process.env.FAULTLINE_MASTER_API_KEY];
    if (allowClientKey) {
        checkKeys.push(process.env.FAULTLINE_CLIENT_API_KEY);
    }
    if (checkKeys.indexOf(event.headers[apiKeyHeader]) < 0) {
        return false;
    }
    return true;
};
