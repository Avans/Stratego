'use strict';

/**
 * Allow Promise functions to be used as express handlers
 */
 module.exports = HttpError;

 function HttpError(status, message) {
    this.status = status;
    this.message = message;
 }
