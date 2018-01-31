'use strict';

const gitlab = require('gitlab');
const messageBuilder = require('../messageBuilder');

module.exports = (n, errorData) => {
    const title = messageBuilder.title(n, errorData);
    let endpoint = 'https://gitlab.com';
    if (n.endpoint) {
        endpoint = n.endpoint;
    }

    const g = gitlab({
        url: endpoint,
        token: n.personalAccessToken
    });

    let acitonIfExist = 'reopen-and-comment';
    if (n.if_exist) {
        acitonIfExist = n.if_exist;
    }

    function isReopen() {
        return (['reopen', 'reopen-and-comment', 'reopen-and-update'].indexOf(acitonIfExist) >= 0);
    }

    function isComment() {
        return (['comment', 'reopen-and-comment'].indexOf(acitonIfExist) >= 0);
    }

    function isUpdate() {
        return (['reopen-and-update'].indexOf(acitonIfExist) >= 0);
    }

    let labels = '';
    if (n.labels) {
        labels = n.labels.join(',');
    }
    const body = messageBuilder.body(n, errorData);
    g.projects.all((projects) => {
        let project = projects.find((project) => {
            return (project.path_with_namespace == `${n.owner}/${n.repo}`);
        });
        g.projects.issues.list(project.id, {
            search: title,
            per_page: 1
        }, (issues) => {
            let issue = issues.find((issue) => {
                return (issue.title == title);
            });
            if (issue) {
                if (isReopen()) {
                    if (isUpdate()) {
                        g.issues.edit(project.id, issue.id, {
                            state_event: 'reopen',
                            title: title,
                            labels: labels,
                            body: body + messageBuilder.footer(n, errorData)
                        });
                    } else {
                        g.issues.edit(project.id, issue.id, {
                            state_event: 'reopen'
                        });
                    }
                }
                if (isComment()) {
                    g.notes.create(project.id, issue.id, {
                        body: body + messageBuilder.commentFooter(n, errorData)
                    });
                }
            } else {
                // Create issue
                g.issues.create(project.id, {
                    title: title,
                    description: body + messageBuilder.footer(n, errorData),
                    labels: labels
                });
            }
        });
    });
};
