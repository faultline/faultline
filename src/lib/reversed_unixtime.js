'use strict';
const maxInteger = Math.pow(2, 53) - 1; // 53 bit
const numberOfDigits = maxInteger.toString(10).length;

module.exports = (unixtime) => {
    const reversed = maxInteger - unixtime;
    return (Array(numberOfDigits).join('0') + reversed).slice(-numberOfDigits);
};
