'use strict';

const console = require('console');
const messageBuilder = require('../messageBuilder');
const truncater = require('../truncater');
const moment = require('moment-timezone');
const Aws = require('../aws');
const aws = new Aws();
const axios = require('axios');
const template = require('url-template');
const {
    reversedUnixtime
} = require('../functions');
const {
    bucketName
} = require('../constants');

module.exports = (n, errorData) => {
    const titleLink = messageBuilder.link(n, errorData);

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
