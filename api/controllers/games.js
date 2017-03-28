'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Game = mongoose.model('Game');

module.exports = {
    get: getGames,
    post: postGames
};

/**
 * Get the list of games that the user is participating in
 */
function getGames(req, res) {
    (async () => {
        let games = await Game.find().findWithUser(req.user);
        games = games.map((game) => game.outputForUser(req.user));
        res.json(games);
    })();
}

/**
 * Create a new game
 */
function postGames(req, res) {
    return (async () => {

        let game;
        if(req.body.ai === true) {
            // Set up a game versus the AI
            game = new Game();
            game.player1 = req.user;
            game.player2 = 'ai';
            game.setState(Game.STATE.WAITING_FOR_PIECES);

            game = await game.save();
        } else {
            // Try to find an existing game to join in
            game = await Game.findOne({state: 'waiting_for_an_opponent'});

            if(game !== null) {
                // Join an existing match
                game.player2 = req.user;
                game.setState(Game.STATE.WAITING_FOR_PIECES);
                game = await game.save();
            } else {
                // Otherwise create a new game
                game = new Game();
                game.player1 = req.user;
                game.setState(Game.STATE.WAITING_FOR_AN_OPPONENT);
                game = await game.save();
            }

        }
        res.status(201).json(game.outputForUser(req.user));
    })();
}

function deleteGames(req, res) {

}