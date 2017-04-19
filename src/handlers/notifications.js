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
            const resByTimeunit = e.results[0].Attributes;
            const res = e.results[1].Attributes;
            let notifyInterval = n.notifyInterval ? n.notifyInterval : 1;
            let threshold = n.threshold ? n.threshold : 1;
            if (res.count == 1) {
                // first notify
                notifier.call(null, n, e.detail);
            } else if (threshold < 0) {
                return;
            } else if (resByTimeunit.count >= threshold
                       && (resByTimeunit.count % notifyInterval) == 0) {
                notifier.call(null, n, e.detail);
            }
        });
    });
};
