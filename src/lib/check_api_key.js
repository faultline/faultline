'use strict';
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));

module.exports = (event, allowClientKey = false) => {
    // Check faultline API Key
    let apiKeyHeader = 'X-Api-Key';
    if (event.headers.hasOwnProperty('x-api-key')) {
        apiKeyHeader = 'x-api-key';
    }
    if (!event.headers.hasOwnProperty(apiKeyHeader)) {
        return false;
    }
    let checkKeys = [config.apiKey];
    if (allowClientKey) {
        checkKeys.push(config.clientApiKey);
    }
    if (checkKeys.indexOf(event.headers[apiKeyHeader]) < 0) {
        return false;
    }
    return true;
};
