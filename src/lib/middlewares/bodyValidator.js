const createError = require('http-errors');
const Ajv = require('ajv');
const ajvKeywords = require('ajv-keywords');

const ajv = new Ajv({v5: true, $data: true, allErrors: true});
ajvKeywords(ajv);

module.exports = (inputSchema) => {
    return {
        before: (handler, next) => {
            const body = handler.event.body;
            const valid = ajv.validate(inputSchema, body);
            if (!valid) {
                throw new createError.BadRequest({
                    errors: ajv.errors.map((v) => {
                        let e = {
                            message: v.message,
                            detail: v
                        };
                        if (v.hasOwnProperty('dataPath')) {
                            e['path'] = v.dataPath.split(/[\.\[\]]/).filter((v) => { return v !== ''; });
                        }
                        return e;
                    })
                });
            }
            return next();
        }
    };
};
