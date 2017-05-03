require('../app');
const expect = require('chai').expect;
const io = require('socket.io-client');

const mongoose = require('mongoose');
const Game = mongoose.model('Game');
const User = mongoose.model('User');

const socketURL = 'http://0.0.0.0:3000';
const TEST_API_KEY = 'TEST_API_KEY';
const query = {'query': 'api_key=' + TEST_API_KEY};

describe('socket.io', function() {

    let game, test_user;
    // Create test user
    before(async function() {
        await User.remove();
        await Game.remove();

        test_user = new User();
        test_user._id = 'test_id';
        test_user.name = 'Test User';
        test_user.api_key = TEST_API_KEY;
        await test_user.save();

        // Game against ai
        game = new Game();
        game.player1 = test_user._id;
        game.player2 = 'ai';
        game = await game.save();
    });

    it('should not connect with an invalid API key', function(done) {
        const client = io.connect(socketURL, {});

        client.on('error', function() {
            done();
        });
    });

    it('should connect with a valid API key', function(done) {
        const client = io.connect(socketURL, query);

        client.on('connect', function() {
            client.disconnect();
            done();
        });
    });

    it('should receive a state change for a game', function(done) {
        const client = io.connect(socketURL, query);

        client.on('connect', function() {
            game.notifyStateChange();
        });

        client.on('statechange', function(gamedata) {
            expect(gamedata).to.deep.eql(game.outputForUser(test_user._id));
            client.disconnect();
            done();
        });
    });

    it('should send new actions', function(done) {
        const client = io.connect(socketURL, query);
        const move = {
            type: 'move',
            square: {row: 0, column: 0},
            square_to: {row: 0, column: 1}
        };

        client.on('connect', function() {
            game.addMove(move);
        });

        client.on('move', function(theMove) {
            expect(move).to.deep.eql(theMove);
            client.disconnect();
            done();
        });
    })
});
