'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Game = mongoose.model('Game');

module.exports = {
    get: getGame
};

/**
 * Get information for a single game
 */
function getGame(req, res) {
    (async () => {
        const game = await Game.findByIdAndUser(req.params.id, req.user);

        if(game == null) {
            res.status(404).json({message: 'De game met het id "' + req.params.id + '" bestaat niet, of doe je niet aan mee.'});
        } else {
            res.json(game.outputForUser(req.user));
        }
    })();
}
