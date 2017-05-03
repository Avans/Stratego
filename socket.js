'use strict';

let io = null;

const mongoose = require('mongoose');
const Game = mongoose.model('Game');
const User = mongoose.model('User');

module.exports = {
    init: function(http) {
        io = new require('socket.io').listen(http);

        // api key authorization
        io.use(function(socket, next) {
            if(!socket.request._query || !socket.request._query.api_key) {
                next(new Error('No api_key sent in query'));
            } else {
                User.findOne({'api_key': socket.request._query.api_key}, function(err, user) {
                    if(!user) {
                        next(new Error('No user found with api_key'));
                    } else {
                        socket.join(user._id);
                        next();
                    }
                });
            }
        });
    },
    sendStateChange: function(game) {
        io.to(game.player1).emit('statechange', game.outputForUser(game.player1));

        if(game.player2) {
            io.to(game.player2).emit('statechange', game.outputForUser(game.player2));
        }
    },

    sendMove: function(game, move) {
        const data = {
            game_id: game._id,
            move: move
        };

        io.to(game.player1).emit('move', data);

        if(game.player2) {
            io.to(game.player2).emit('move', data);
        }
    }
}
