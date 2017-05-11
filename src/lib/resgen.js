'use strict';

module.exports = (statusCode, body) => {
    let stringified = body;
    if (typeof body === 'object') {
        stringified = JSON.stringify(body, null, 2);
    }
    const response = {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        body: stringified
    };
    return response;
};
