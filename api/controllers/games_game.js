'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Game = mongoose.model('Game');

var wrap_promise = require('../../helpers/wrap_promise');
var HttpError = require('../../helpers/HttpError');

module.exports = {
    get: wrap_promise(getGame),
    delete: wrap_promise(deleteGame),
    post_start_board: wrap_promise(postStartBoard)
};

/**
 * Get information for a single game
 */
async function getGame(req, res) {
    const game = await Game.findByIdAndUser(req.params.id, req.user);

    res.json(game.outputForUser(req.user));
}

/**
 * Delete a single game
 */
async function deleteGame(req, res) {
    const game = await Game.findByIdAndUser(req.params.id, req.user);

    await game.remove();
    res.status(204).send('');
}

/**
 * Post a start board
 */
async function postStartBoard(req, res) {
    let game = await Game.findByIdAndUser(req.params.id, req.user);

    // Set up the start board
    game.setUpStartBoard(req.user._id, req.body);

    // Start the game!
    if(game.player1_set_up_pieces && game.player2_set_up_pieces) {
        game.player1_turn = true;
        game.start_board = game.board;
        game.setState(Game.STATE.STARTED);
    }

    game = await game.save();

    res.json(game.outputForUser(game));
}
