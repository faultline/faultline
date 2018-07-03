'use strict';

const moment = require('moment-timezone');
const Aws = require('./aws');
const aws = new Aws();
const template = require('url-template');
const truncater = require('./truncater');
const {
    reversedUnixtime
} = require('./functions');
const {
    bucketName
} = require('./constants');

const messageBuilder = {
    title: (n, errorData) => {
        const title = `[${errorData.type}] ${errorData.message}`;
        return truncater.truncateTitle(title);
    },
    link: (n, errorData) => {
        let link = null;
        const truncatedMessage = truncater.truncateMessage(errorData.message);
        if (n.linkTemplate) {
            const linkTemplate = template.parse(n.linkTemplate);
            link = linkTemplate.expand({
                project: errorData.project,
                message: truncatedMessage,
                reversedUnixtime: reversedUnixtime(moment(errorData.timestamp, moment.ISO_8601).unix())
            });
        } else {
            const key = [
            'projects',
            errorData.project,
            'errors',
            truncatedMessage,
            'occurrences',
            reversedUnixtime(moment(errorData.timestamp, moment.ISO_8601).unix())
        ].join('/') + '.json';
            let linkExpires = -1;
            if (n.linkExpires) {
                linkExpires = n.linkExpires;
            }
            if (linkExpires > 0) {
                const params = {
                    Bucket: bucketName,
                    Key: key,
                    Expires: linkExpires
                };
                link = aws.storage.getSignedUrl(params);
            }
        }
        return link;
    },
    body: (n, errorData) => {
        let body = '';

        const link = messageBuilder.link(n, errorData);
        if (link) {
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

        footer += '> This issue was created by [faultline](https://github.com/faultline/faultline).';
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
