'use strict';

const slack = require('../lib/slack');
const github = require('../lib/github');

module.exports.call = (event, context, cb) => {
    const notifications = event.notifications;
    const res = event.res;
    notifications.forEach((n) => {
        let notifier = null;
        if (n.type == 'slack') {
            notifier = slack;
        } else if (n.type == 'github') {
            notifier = github;
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
    });
};
