'use strict';

const sha256 = require('js-sha256');
/**
 *  | value                        | bytes |
 *  | ---------------------------- | ----- |
 *  | S3 object key limit          |  1024 |
 *  | "projects/"                  |     9 |
 *  | falutline project name limit |   256 |
 *  | "/errors/"                   |     8 |
 *  | "/occurrences/"              |    13 |
 *  | reversedUnixtime             |    16 |
 *  | ".json"                      |     5 |
 *  | SHA256                       |    64 |
 *  | "--truncated-by-faultline--" |    26 |
 **/
const messageMaxBytes = 627;

const titleMaxBytes = 250; // GitHub:256byte, GitLab:253byte

String.prototype.bytes = function(){
    return(encodeURIComponent(this).replace(/%../g,'x').length);
};

const truncater = {
    truncateMessage: (origin) => {
        if (origin.bytes() < messageMaxBytes) {
            return origin;
        }
        let prefix = '';
        let truncated = '';
        Array.of(...origin).forEach((str) => {
            if (prefix.bytes() >= messageMaxBytes) {
                truncated += str;
                return;
            }
            prefix += str;
        });
        return [prefix, sha256(truncated)].join('--truncated-by-faultline--');
    },
    truncateTitle: (title) => {
        if (title.bytes() < titleMaxBytes) {
            return title;
        }
        let prefix = '';
        let truncated = '';
        Array.of(...title).forEach((str) => {
            if (prefix.bytes() >= titleMaxBytes - '...'.bytes() - 10) {
                truncated += str;
                return;
            }
            prefix += str;
        });
        const minHash = sha256(truncated).slice(0, 10);
        return [prefix, minHash].join('...');
    }
};

module.exports = truncater;
