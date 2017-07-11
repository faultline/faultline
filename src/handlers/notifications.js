'use strict';

const yaml = require('js-yaml');
const fs = require('fs');
const config = yaml.safeLoad(fs.readFileSync(__dirname + '/../../config.yml', 'utf8'));
const slack = require('../lib/slack');
const github = require('../lib/github');
const gitlab = require('../lib/gitlab');
const aws = require('../lib/aws')(config);
const kms = aws.kms;

module.exports.call = (event, context, cb) => {
    const notifications = event.notifications;
    const res = event.res;

    const notifyCall = (n) => {
        if (typeof n !== 'object') {
            cb('notifyCall error', n);
            return;
        }

        let notifier = null;
        if (n.type == 'slack') {
            notifier = slack;
        } else if (n.type == 'github') {
            notifier = github;
        } else if (n.type == 'gitlab') {
            notifier = gitlab;
        } else {
            return;
        }
        res.forEach((e) => {
            const resByTimeunitCount = e.counts[0];
            const resCount = e.counts[1];
            let notifyInterval = n.notifyInterval ? n.notifyInterval : 1;
            let threshold = n.threshold ? n.threshold : 1;
            if (resCount == 1) {
                // first notify
                notifier.call(null, n, e.detail);
            } else if (threshold < 0) {
                return;
            } else if (resByTimeunitCount >= threshold
                       && (resByTimeunitCount % notifyInterval) == 0) {
                notifier.call(null, n, e.detail);
            }
        });
    };

    notifications.forEach((n) => {
        if (typeof n === 'string') {
            // KMS encrypted
            const kmsEncyptedToken = n;
            const encryptedBuf = new Buffer(kmsEncyptedToken, 'base64');
            const cipherText = { CiphertextBlob: encryptedBuf };
            kms.decrypt(cipherText).promise().then((data) => {
                const decrypted = JSON.parse(data.Plaintext.toString('ascii'));
                notifyCall(decrypted);
            }).catch((err) => {
                console.log(err);
                cb('Decrypt error', err);
            });
        } else {
            notifyCall(n);
        }
    });
};
