'use strict';
const describe = require('mocha').describe;
const it = require('mocha').it;
const assert = require('power-assert');
const { reversedUnixtime } = require('../functions');

describe('reversedUnixtime', () => {
    it ('reversedUnixtime(0) -> "9007199254740991"', () => {
        assert(reversedUnixtime(0) === '9007199254740991');
    });

    it ('reversedUnixtime(9000000000000000 -> "0007199254740991")', () => {
        assert(reversedUnixtime(9000000000000000) === '0007199254740991');
    });
});
