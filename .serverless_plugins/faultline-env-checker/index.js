'use strict';

const BbPromise = require('bluebird');

class FaultlineEnvChecker {
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options || {};
        this.environment = this.serverless.service.provider.environment;

        this.hooks = {
            'package:initialize': () => BbPromise.bind(this)
                .then(this.check)
        };
    }

    check() {
        const env = this.serverless.service.provider.environment;
        Object.keys(env).forEach((k) => {
            if (env[k] === null || env[k] === undefined) {
                throw [k, 'is required'].join(' ');
            }
            if (typeof env[k] === 'boolean') {
                throw [k, 'should be 0 or 1'].join(' ');
            }
        });

        return BbPromise.resolve();
    }
}

module.exports = FaultlineEnvChecker;
