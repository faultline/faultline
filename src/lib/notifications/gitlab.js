'use strict';

const Gitlab = require('gitlab/dist/es5').default;
const messageBuilder = require('../messageBuilder');

module.exports = (n, errorData) => {
    const title = messageBuilder.title(n, errorData);
    let endpoint = 'https://gitlab.com';
    if (n.endpoint) {
        endpoint = n.endpoint;
    }

    const g = new Gitlab({
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

    let project = null;

    g.Projects.all({owned:true})
        .then((projects) => {
            project = projects.find((project) => {
                return (project.path_with_namespace == `${n.owner}/${n.repo}`);
            });
            return g.Issues.all(project.id, {
                search: title,
                maxPages: 1
            });
        })
        .then((issues) => {
            let issue = issues.find((issue) => {
                return (issue.title == title);
            });
            if (issue) {
                const promises = [];
                if (isReopen()) {
                    if (isUpdate()) {
                        promises.push(g.Issues.edit(project.id, issue.iid, {
                            stateEvent: 'reopen',
                            title: title,
                            labels: labels,
                            body: body + messageBuilder.footer(n, errorData)
                        }));
                    } else {
                        promises.push(g.Issues.edit(project.id, issue.iid, {
                            stateEvent: 'reopen'
                        }));
                    }
                }
                if (isComment()) {
                    promises.push(g.IssueNotes.create(project.id, issue.iid, {
                        body: body + messageBuilder.commentFooter(n, errorData)
                    }));
                }
                return Promise.all(promises);
            } else {
                // Create issue
                return g.Issues.create(project.id, {
                    title: title,
                    description: body + messageBuilder.footer(n, errorData),
                    labels: labels
                });
            }
        })
        .then(() => {
        })
        .catch((err) => {
            console.error(err);
        });

};
