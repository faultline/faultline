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

String.prototype.bytes = function(){
    return(encodeURIComponent(this).replace(/%../g,'x').length);
};

module.exports = (origin) => {
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
};
