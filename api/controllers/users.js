'use strict';

var wrap_promise = require('../../helpers/wrap_promise');

module.exports = {
    get_me: wrap_promise(getMe),
};

/**
 * Get information about the current user
 */
async function getMe(req, res) {
    res.json({
        id: req.user._id,
        name: req.user.name
    });
}
