'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const configPath = __dirname + '/../../config.yml';
let config = {};
try {
    fs.accessSync(configPath);
    config = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'));
} catch (e) {/** **/}

module.exports.env = () => {
    const defaults = {
        FAULTLINE_REGION: 'ap-northeast-1',
        FAULTLINE_S3_BUCKET_NAME: null,
        FAULTLINE_DYNAMODB_TABLE_PREFIX: 'faultline',
        FAULTLINE_TIMEUNIT: 'minute',
        FAULTLINE_MASTER_API_KEY: null,
        FAULTLINE_CLIENT_API_KEY: null,
        FAULTLINE_LOG_RETENTION_IN_DAYS: 180,
        FAULTLINE_USE_KMS: false,
        FAULTLINE_KMS_KEY_ALIAS: 'faultline'
    };
    let env = {};
    Object.keys(defaults).forEach((k) => {
        let configKey = k.replace(/^FAULTLINE_/,'').toLowerCase().replace(/_([a-z])/g, (g) => { return g[1].toUpperCase(); });
        if (process.env[k]) {
            env[k] = process.env[k];
        } else if (config.hasOwnProperty(configKey)) {
            env[k] = config[configKey];
        } else {
            env[k] = defaults[k];
        }

        // cast boolean to number
        if (typeof env[k] == 'boolean') {
            env[k] = Number(env[k]);
        }
    });
    return env;
};
