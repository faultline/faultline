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
const axios = require('axios');

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
                        value: errorData.timestamp,
                        short: true
                    }
                ],
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
        data.icon_url = 'https://k1low.github.io/faultline/icon.png';
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
