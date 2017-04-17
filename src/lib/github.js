'use strict';

const github = require('github');

module.exports = (n, errorData) => {
    const title = `[${errorData.type}] ${errorData.message}`;

    const g = new github({
        timeout: 5000
    });

    g.authenticate({
        type: 'token',
        token: n.userToken
    });

    g.issues.getForRepo({
        owner: n.owner,
        repo: n.repo,
        state: 'all',
        per_page: 100
    }).then((res) => {
        const filtered = res.filter((issue) => {
            return issue.title == title;
        });
        if (filtered.length == 1) {
            return g.issues.edit({
                owner: n.owner,
                repo: n.repo,
                number: filtered[0].number,
                state: 'open'
            });
        }
        return true;
    }).then((res) => {
        let issue = {
            owner: n.owner,
            repo: n.repo
        };

        if (n.labels) {
            issue.labels = n.labels;
        }

        let body = '';

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

        if (res.number) {
            // create comment
            issue.number = res.number;
            issue.body = body;
            return g.issues.createComment(issue);
        }

        // create issue
        issue.title = title;

        let footer = `## project
${errorData.project}

## type
${errorData.type}

## timestamp
${errorData.timestamp}

`;

        footer += '> This issue was created by [faultline](https://github.com/k1LoW/faultline).';
        body += footer;

        issue.body = body;

        return g.issues.create(issue);
    }).then((res) => {
        console.log(res);
    }).catch((err) => {
        console.log(err);
    });

};
