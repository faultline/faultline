const getByteLength = (str) => {
    return(encodeURIComponent(str).replace(/%../g,'x').length);
};
module.exports.getByteLength = getByteLength;

module.exports.chunkArray = (arr, chunkBytes = 128000) => {
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
    return sets;
};

const maxInteger = Math.pow(2, 53) - 1; // 53 bit
const numberOfDigits = maxInteger.toString(10).length;

module.exports.reversedUnixtime = (unixtime) => {
    const reversed = maxInteger - unixtime;
    return (Array(numberOfDigits).join('0') + reversed).slice(-numberOfDigits);
};

module.exports.resgen = (statusCode, body) => {
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

module.exports.checkApiKey = (event, allowClientKey = false) => {
    if (!process.env.FAULTLINE_MASTER_API_KEY && !process.env.FAULTLINE_CLIENT_API_KEY) {
        return true;
    }
    // Check faultline API Key
    let apiKeyHeader = 'X-Api-Key';
    if (event.headers.hasOwnProperty('x-api-key')) {
        apiKeyHeader = 'x-api-key';
    }
    if (!event.headers.hasOwnProperty(apiKeyHeader)) {
        return false;
    }
    let checkKeys = [process.env.FAULTLINE_MASTER_API_KEY];
    if (allowClientKey) {
        checkKeys.push(process.env.FAULTLINE_CLIENT_API_KEY);
    }
    if (checkKeys.indexOf(event.headers[apiKeyHeader]) < 0) {
        return false;
    }
    return true;
};
