const getByteLength = (str) => {
    return(encodeURIComponent(str).replace(/%../g,'x').length);
};

const chunkArray = (arr, chunkBytes = 128000) => {
    // invoke payload size limit 128kb
    // http://docs.aws.amazon.com/lambda/latest/dg/limits.html
    let sets = [];
    let len = arr.length;
    let chunk = [];
    for (let i = 0; i < len; i++) {
        chunk.push(arr[i]);
        if (getByteLength(JSON.stringify(chunk)) > chunkBytes) {
            let poped = chunk.pop();
            sets.push(chunk);
            chunk = [poped];
        }
    }
    if (chunk.length > 0) {
        sets.push(chunk);
    }
    if (sets.length > 0 && sets[0].toString() === [].toString()) {
        sets.shift();
    }
    return sets;
};

const maxInteger = Math.pow(2, 53) - 1; // 53 bit
const numberOfDigits = maxInteger.toString(10).length;

const reversedUnixtime = (unixtime) => {
    const reversed = maxInteger - unixtime;
    return (Array(numberOfDigits).join('0') + reversed).slice(-numberOfDigits);
};

const createResponse = (statusCode, body) => {
    let stringified = body;
    if (typeof body === 'object') {
        stringified = JSON.stringify(body, null, 2);
    }
    const response = {
        statusCode: statusCode,
        body: stringified
    };
    return response;
};

module.exports = { getByteLength, chunkArray, reversedUnixtime, createResponse };
