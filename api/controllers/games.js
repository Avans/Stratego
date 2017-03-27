'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Game = mongoose.model('Game');

module.exports = {
  get: getGames
};


function getGames(req, res) {
    console.log('haya');
    Game.find().findWithUser(req.user).exec(function(err, games) {
        console.log('GAMES', err, games);
        res.json(games);
    });
    res.json([]);

}

function postGames(req, res) {

}

function deleteGames(req, res) {

}