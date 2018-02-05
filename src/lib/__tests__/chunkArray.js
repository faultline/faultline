'use strict';
const describe = require('mocha').describe;
const it = require('mocha').it;
const assert = require('power-assert');
const { chunkArray } = require('../functions');

describe('chunkArray', () => {
    it ('chunkArray(["012", "34", "5678"], 5) -> [["012"], ["34"], ["5678"]]', () => {
        assert(chunkArray(['012', '34', '5678'], 5).toString() === [['012'], ['34'], ['5678']].toString());
    });
    it ('chunkArray(["012", "34", "5678"], 11) -> [["012"], ["34"], ["5678"]]', () => {
        assert(chunkArray(['012', '34', '5678'], 5).toString() === [['012'], ['34'], ['5678']].toString());
    });
    it ('chunkArray(["012", "34", "5678"], 12) -> [["012", "34"], ["5678"]]', () => {
        assert(chunkArray(['012', '34', '5678'], 5).toString() === [['012', '34'], ['5678']].toString());
    });
    it ('chunkArray([], 5) -> []', () => {
        assert(chunkArray([], 5).push(1).toString() === [].push(1).toString());
    });
});
