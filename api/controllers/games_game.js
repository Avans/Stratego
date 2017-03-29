'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Game = mongoose.model('Game');

module.exports = {
    get: getGame,
    delete: deleteGame,
    post_start_board: postStartBoard
};

/**
 * Return a 404 error that the game couldn't be found
 */
function noSuchGame(req, res) {
    res.status(404).json({message: 'De game met het id "' + req.params.id + '" bestaat niet, of doe je niet aan mee.'});
}

/**
 * Get information for a single game
 */
function getGame(req, res) {
    (async () => {
        const game = await Game.findByIdAndUser(req.params.id, req.user);

        if(game === null) {
            return noSuchGame(req, res);
        } else {
            res.json(game.outputForUser(req.user));
        }
    })();
}

/**
 * Delete a single game
 */
function deleteGame(req, res) {
    (async () => {
        const game = await Game.findByIdAndUser(req.params.id, req.user);

        if(game === null) {
            return noSuchGame(req, res);
        } else {
            await game.remove();
            res.status(204).send('');
        }
    })();
}

/**
 * Post a start board
 */
function postStartBoard(req, res) {
    (async () => {
        const game = await Game.findByIdAndUser(req.params.id, req.user);

        if(game === null) {
            return noSuchGame(req, res);
        }


    })();
}
