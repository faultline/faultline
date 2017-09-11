'use strict';

const moment = require('moment-timezone');
const template = require('url-template');
const reversedUnixtime = require('./reversed_unixtime');
const hashTruncate = require('./hash_truncate');

const messageBuilder = {
    body: (n, errorData) => {
        let body = '';

        if (n.linkTemplate) {
            const linkTemplate = template.parse(n.linkTemplate);
            const truncatedMessage = hashTruncate(errorData.message);
            const link = linkTemplate.expand({
                project: errorData.project,
                message: truncatedMessage,
                reversedUnixtime: reversedUnixtime(moment(errorData.timestamp, moment.ISO_8601).unix())
            });
            body += '## link\n\n\n' + link + '\n\n';
        }

        if (errorData.backtrace) {
            let backtrace = '## backtrace\n\n';
            backtrace += '```\n';
            errorData.backtrace.forEach((b) => {
                backtrace += b.file + '(' + b.line + ') ' + b.function + '\n';
            });
            backtrace += '```\n\n';
            body += backtrace;
        }

        ['context', 'environment', 'session', 'params'].forEach((k) => {
            if (errorData[k] && JSON.stringify(errorData[k], null, 2) != '{}') {
                let content = '## ' + k;
                content += '\n\n\n';
                content += '```\n';
                content += JSON.stringify(errorData[k], null, 2);
                content += '\n';
                content += '```\n\n';
                body += content;
            }
        });

        return body;
    },
    footer: (n, errorData) => {
        const timestamp = (n.timezone)
          ? moment(errorData.timestamp, moment.ISO_8601).tz(n.timezone).format()
          : moment(errorData.timestamp, moment.ISO_8601).format();

        let footer = `## project
${errorData.project}

## type
${errorData.type}

## timestamp
${timestamp}

`;

        footer += '> This issue was created by [faultline](https://github.com/k1LoW/faultline).';
        return footer;
    },
    commentFooter: (n, errorData) => {
        const timestamp = (n.timezone)
          ? moment(errorData.timestamp, moment.ISO_8601).tz(n.timezone).format()
          : moment(errorData.timestamp, moment.ISO_8601).format();
        return '## timestamp\n' + timestamp;
    }
};

module.exports = messageBuilder;
