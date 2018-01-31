const stringifier = (handler, next) => {
    if (handler.response.hasOwnProperty('body')
        && typeof handler.response.body === 'object') {
        handler.response.body = JSON.stringify(handler.response.body, null, 2);
    }
    next();
};

module.exports = () => {
    return {
        after: stringifier,
        onError: stringifier
    };
};
