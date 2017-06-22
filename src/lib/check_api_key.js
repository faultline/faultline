'use strict';

module.exports = (event, config, allowClientKey = false) => {
    if (!config.masterApiKey && !config.clientApiKey) {
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
    let checkKeys = [config.masterApiKey];
    if (allowClientKey) {
        checkKeys.push(config.clientApiKey);
    }
    if (checkKeys.indexOf(event.headers[apiKeyHeader]) < 0) {
        return false;
    }
    return true;
};
