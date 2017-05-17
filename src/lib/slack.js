'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const reversedUnixtime = require('./reversed_unixtime');
const moment = require('moment-timezone');
const storage = require('./storage');
const bucketName = config.s3BucketName;
const axios = require('axios');

module.exports = (n, errorData) => {
    const key = [
        'projects',
        errorData.project,
        'errors',
        errorData.message,
        'occurrences',
        reversedUnixtime(moment(errorData.timestamp, moment.ISO_8601).format('X'))
    ].join('/') + '.json';
    const timestamp = (n.timezone)
          ? moment(errorData.timestamp, moment.ISO_8601).tz(n.timezone).format()
          : moment(errorData.timestamp, moment.ISO_8601).format();

    const params = {
        Bucket: bucketName,
        Key: key
    };
    const signedUrl = storage.getSignedUrl(params);

    let data = {
        channel: n.channel,
        username: n.username,
        attachments: [
            {
                fallback: errorData.message,
                title: errorData.message,
                title_link: signedUrl,
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
    if (n.icon_url) {
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
        .then((res) => {
            //console.log(res);
        })
        .catch((err) => {
            console.log(err);
        });
};
