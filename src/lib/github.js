'use strict';

const console = require('console');
const github = require('github');
const moment = require('moment-timezone');
const template = require('url-template');
const reversedUnixtime = require('./reversed_unixtime');

module.exports = (n, errorData) => {
    const title = `[${errorData.type}] ${errorData.message}`;
    const timestamp = (n.timezone)
          ? moment(errorData.timestamp, moment.ISO_8601).tz(n.timezone).format()
          : moment(errorData.timestamp, moment.ISO_8601).format();

    const g = new github({
        timeout: 5000
    });

    g.authenticate({
        type: 'token',
        token: n.userToken
    });

    let acitonIfExist = 'reopen-and-comment';
    if (n.if_exist) {
        acitonIfExist = n.if_exist;
    }

    function buildBody() {
        let body = '';

        if (n.linkTemplate) {
            const linkTemplate = template.parse(n.linkTemplate);
            const link = linkTemplate.expand({
                project: errorData.project,
                message: errorData.message,
                reversedUnixtime: reversedUnixtime(moment(errorData.timestamp, moment.ISO_8601).unix())
            });
            body += '## link\n\n\n' + link + '\n\n';
        }

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

        return body;
    }

    function buildFooter() {
        let footer = `## project
${errorData.project}

## type
${errorData.type}

## timestamp
${timestamp}

`;

        footer += '> This issue was created by [faultline](https://github.com/k1LoW/faultline).';
        return footer;
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

    function getAllIssues(arr) {
        if (!arr) arr=[];
        const limit = 100;
        let page = Math.ceil(arr.length / limit) + 1;
        let condition = {
            owner: n.owner,
            repo: n.repo,
            state: 'all',
            per_page: limit,
            page: page
        };
        return g.issues.getForRepo(condition).then(function(results) {
            if (!results.length)
                return arr;
            else
                return getAllIssues(arr.concat(results));
        });
    }

    getAllIssues().then((res) => {
        const filtered = res.filter((issue) => {
            return issue.title == title;
        });
        let promises = [];
        let labels = [];
        if (n.labels) {
            labels = n.labels;
        }
        const body = buildBody();
        if (filtered.length == 1) {
            const number = filtered[0].number;
            if (isReopen()) {
                if (isUpdate()) {
                    promises.push(g.issues.edit({
                        owner: n.owner,
                        repo: n.repo,
                        number: number,
                        state: 'open',
                        title: title,
                        labels: labels,
                        body: body + buildFooter()
                    }));
                } else {
                    promises.push(g.issues.edit({
                        owner: n.owner,
                        repo: n.repo,
                        number: number,
                        state: 'open'
                    }));
                }
            }
            if (isComment()) {
                promises.push(g.issues.createComment({
                    owner: n.owner,
                    repo: n.repo,
                    number: number,
                    body: body + '## timestamp\n' + timestamp
                }));
            }
        } else {
            // Create issue
            promises.push(g.issues.create({
                owner: n.owner,
                repo: n.repo,
                title: title,
                labels: labels,
                body: body + buildFooter()
            }));
        }
        return Promise.all(promises);
    }).then(() => {
    }).catch((err) => {
        console.error(err);
    });

};
