'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Game = mongoose.model('Game');

module.exports = {
  get: getGames
};


function getGames(req, res) {
    (async () => {

        const games = await Game.find().findWithUser(req.user);
        res.json(games);
    })();
}

function postGames(req, res) {

}

function deleteGames(req, res) {

}