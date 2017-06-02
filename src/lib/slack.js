'use strict';

const console = require('console');
const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const reversedUnixtime = require('./reversed_unixtime');
const moment = require('moment-timezone');
const storage = require('./storage');
const bucketName = config.s3BucketName;
const axios = require('axios');
const template = require('url-template');

module.exports = (n, errorData) => {
    let titleLink = null;
    if (n.linkTemplate) {
        const linkTemplate = template.parse(n.linkTemplate);
        titleLink = linkTemplate.expand({
            project: errorData.project,
            message: errorData.message,
            reversedUnixtime: reversedUnixtime(moment(errorData.timestamp, moment.ISO_8601).unix())
        });
    } else {
        const key = [
            'projects',
            errorData.project,
            'errors',
            errorData.message,
            'occurrences',
            reversedUnixtime(moment(errorData.timestamp, moment.ISO_8601).unix())
        ].join('/') + '.json';
        const params = {
            Bucket: bucketName,
            Key: key
        };
        titleLink = storage.getSignedUrl(params);
    }

    const timestamp = (n.timezone)
          ? moment(errorData.timestamp, moment.ISO_8601).tz(n.timezone).format()
          : moment(errorData.timestamp, moment.ISO_8601).format();

    let data = {
        channel: n.channel,
        username: n.username,
        attachments: [
            {
                fallback: errorData.message,
                title: errorData.message,
                title_link: titleLink,
                fields: [
                    {
                        title: 'project',
                        value: errorData.project,
                        short: true
                    },
                    {
                        title: 'type',
                        value: errorData.type,
                        short: true
                    },
                    {
                        title: 'timestamp',
                        value: timestamp,
                        short: true
                    }
                ],
                footer: 'faultline',
                footer_icon: 'https://faultline.github.io/faultline/icon.png',
                ts: moment(timestamp).unix(),
                color: '#E06A3B'
            }
        ]
    };

    // icon
    if (n.iconUrl) {
        data.icon_url = n.iconUrl;
    } else if(n.iconEmoji) {
        data.icon_emoji = n.iconEmoji;
    } else if (n.icon_url) {
        data.icon_url = n.icon_url;
    } else if(n.icon_emoji) {
        data.icon_emoji = n.icon_emoji;
    } else {
        data.icon_url = 'https://faultline.github.io/faultline/icon.png';
    }

    let backtrace = '';
    if (errorData.backtrace) {
        errorData.backtrace.forEach((b) => {
            backtrace += b.file + '(' + b.line + ') ' + b.function + '\n';
        });
        data.attachments[0].fields.push({
            title: 'backtrace',
            value: backtrace,
            short: false
        });
    }

    axios.post(n.endpoint, data)
        .then(() => {
        })
        .catch((err) => {
            console.error(err);
        });
};
