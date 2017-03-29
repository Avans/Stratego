'use strict';

/**
 * Allow Promise functions to be used as express handlers
 */
 module.exports = ValidationError;

 function ValidationError(message) {
    this.status = 400;
    this.message = message;
 }
