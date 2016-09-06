'use strict';

module.exports = (statusCode, body) => {
    const response = {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(body, null, 2)
    };
    return response;
};
