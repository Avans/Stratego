'use strict';

var mongoose = require('mongoose');
var Game = mongoose.model('Game');
var wrap_promise = require('../../helpers/wrap_promise');

module.exports = {
    get: wrap_promise(getGames),
    post: wrap_promise(postGames),
    delete: wrap_promise(deleteGames)
};

/**
 * Get the list of games that the user is participating in
 */
async function getGames(req, res) {
    let games = await Game.find().findWithUser(req.user);
    games = games.map((game) => game.outputForUser(req.user));
    res.json(games);
}

/**
 * Create a new game
 */
async function postGames(req, res) {
    let game;
    if(req.body.ai === true) {
        // Set up a game versus the AI
        game = new Game();
        game.player1 = req.user._id;
        game.player2 = 'ai';
        game.setState(Game.STATE.WAITING_FOR_PIECES);

        // The AI immediately puts down its pieces
        game.setUpStartBoard('ai', Game.getAIStartBoard());

        game = await game.save();
    } else {
        // Check that the user is not already waiting for an opponent
        const user_already_has_waiting_game = (await Game.count({
            player1: req.user._id,
            state: Game.STATE.WAITING_FOR_AN_OPPONENT
        }) >= 1);

        if(user_already_has_waiting_game) {
            res.status(400).json({error: "You already have a game that is waiting for an opponent"});
            return;
        }

        // Try to find an existing game to join in
        game = await Game.findOne({state: Game.STATE.WAITING_FOR_AN_OPPONENT});

        if(game !== null) {
            // Join an existing match
            game.player2 = req.user._id;
            game.setState(Game.STATE.WAITING_FOR_PIECES);
            game = await game.save();
        } else {
            // Otherwise create a new game
            game = new Game();
            game.player1 = req.user._id;
            game.setState(Game.STATE.WAITING_FOR_AN_OPPONENT);
            game = await game.save();
        }

    }
    res.status(201).json(game.outputForUser(req.user));
}

/**
 * Delete all games with the user
 */
async function deleteGames(req, res) {
    await Game.find().findWithUser(req.user).remove();

    res.status(204).send('');
}