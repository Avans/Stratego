'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Game = mongoose.model('Game');

var wrap_promise = require('../../helpers/wrap_promise');
var HttpError = require('../../helpers/HttpError');

module.exports = {
    get: wrap_promise(getGame),
    delete: wrap_promise(deleteGame),
    post_start_board: wrap_promise(postStartBoard),
    post_actions: wrap_promise(postActions),
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

/**
 * Post a start board
 */
async function postActions(req, res) {
    let game = await Game.findByIdAndUser(req.params.id, req.user);

    const actions = game.doMove(
        req.user._id,
        req.body.square.column,
        req.body.square.row,
        req.body.square_to.column,
        req.body.square_to.row);

    // TODO: Do an AI move


    // Show the actions from the rotated point of view for player 2
    if(game.getPlayerNumber(req.user._id) === 2) {
        Game.rotateActions(actions);
    }

    await game.save();

    res.json({
        game: game.outputForUser(req.user),
        actions: actions
    });
}