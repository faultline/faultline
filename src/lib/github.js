'use strict';

const timestampFormat = 'YYYY-MM-DDTHH:mm:ssZ'; // ISO8601
const timeunits = require('./timeunits');
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const timeunitFormat = timeunits[config.timeunit];
const moment = require('moment');
const storage = require('./storage');
const bucketName = config.s3BucketName;
const github = require('github');

module.exports = (n, errorData) => {
    const byTimeunit = moment(moment(errorData.timestamp).format(timeunitFormat), timeunitFormat).format(timestampFormat);
    const key = 'projects/'
              + errorData.project + '/'
              + errorData.message + '/'
              + byTimeunit + '/'
              + errorData.project + '-'
              + errorData.message + '-'
              + errorData.timestamp + '.json';

    const params = {
        Bucket: bucketName,
        Key: key
    };
    const signedUrl = storage.getSignedUrl(params);

    const g = new github({
        timeout: 5000
    });

    g.authenticate({
        type: 'token',
        token: n.userToken
    });

    let issue = {
        owner: n.owner,
        repo: n.repo,
        title: `[${errorData.type}] ${errorData.message}`
    };

    let body = `## project
${errorData.project}

## type
${errorData.type}

## timestamp
${errorData.timestamp}

`;

    if (errorData.backtrace) {
        let backtrace = `## backtrace

`;
        backtrace += "```\n";
        errorData.backtrace.forEach((b) => {
            backtrace += b.file + '(' + b.line + ') ' + b.function + "\n";
        });
        backtrace += "```\n\n";
        body = backtrace + body;
    }

    body += '> This issue was created by [faultline](https://github.com/k1LoW/faultline).';

    issue.body = body;

    g.issues.create(issue)
        .then((res) => {
            console.log(res);
        })
        .catch((err) => {
            console.log(err);
        });
};
