'use strict';

/**
 * Allow Promise functions to be used as express handlers
 */
 module.exports = (async_function) => {
    return (req, res, next) => {
        async_function(req, res).catch((err) => {
            next(err);
        });
    }
}
