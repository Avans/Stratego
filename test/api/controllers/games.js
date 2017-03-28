var should = require('should');
var server = require('../../../app');
var request = require('supertest')(server);

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Game = mongoose.model('Game');


const API_KEY = 'TEST_API_KEY';
const TEST_GAME_ID = 'test_game_id';
var test_user;

/**
 * Returns a request with the correct url and expectations
 */
var api_request = function() {
    function apify_request(request) {
        return request; // TODO: add expects
    }
    function apify_url(url) {
        return url + '?api_key=' + API_KEY;
    }

    return {
        get: function(url) {
            return apify_request(request.get(apify_url(url)));
        },
        post: function(url) {
            return apify_request(request.post(apify_url(url)).type('json'));
        },
        delete: function(url) {
            return apify_request(request.delete(apify_url(url)));
        }
    }
}();

/**
 * Ensure that the environment is the same by resetting the database for each test
 */
beforeEach(async function() {
    await User.remove({});
    await Game.remove({});

    test_user = new User();
    test_user._id = 'test_id';
    test_user.name = 'Test User';
    test_user.api_key = API_KEY;
    await test_user.save();
});

/**
 * Test API key checks
 */
describe('api_key checks', function() {
    const SOME_API = '/api/games';

    it('should give an error when the api_key is missing', async function() {
        const res = await request.get(SOME_API).expect(403);

        res.body.should.eql({
            message: 'Geef via de URL je api_key mee'
        });
    });

    it('should give an error when the api_key is not corresponding to any user', async function() {
        const res = await request.get(SOME_API + '?api_key=nonexistingapikey').expect(403);

        res.body.should.eql({
            message: 'De API key "nonexistingapikey" is niet bekend'
        });
    })
});

describe('GET /api/games', function() {

    it('should return no games with empty database', async function() {
        const res = await api_request.get('/api/games').expect(200);

        res.body.should.eql([]);
      });

    it('should return a game with the user as player 1', async function() {
        let game = new Game();
        game.player1 = test_user._id;
        game = await game.save()

        const res = await api_request.get('/api/games').expect(200);

        res.body.should.eql([game.outputForUser(test_user)]);
    });

    it('should return a game with the user as player 2', async function() {
        let game = new Game();
        game.player1 = 'some_player';
        game.player2 = test_user._id;
        game = await game.save()

        const res = await api_request.get('/api/games').expect(200);

        res.body.should.eql([game.outputForUser(test_user)]);
    });

    it('shouldn\'t return games the user is not participating in', async function() {
        let game = new Game();
        game.player1 = 'some_player';
        game.player2 = 'some_other_player'
        game = await game.save()

        const res = await api_request.get('/api/games').expect(200);

        res.body.should.eql([]);
    });
});

describe('POST /api/games', function() {
    it('should create a new game', async function() {
        const res = await api_request
                            .post('/api/games')
                            .send('{"ai": false}')
                            .expect(201);

        const game = await Game.findById(res.body.id);

        // Test for correct output
        res.body.should.eql(game.outputForUser(test_user));

        // Test if the game is in a correct state
        game.player1.should.eql(test_user._id);
        should.not.exist(game.player2);
        game.state.should.eql('waiting_for_an_opponent');
    });

    it('should create a new AI game', async function() {
        const res = await api_request
                            .post('/api/games')
                            .send('{"ai": true}')
                            .expect(201);

        const game = await Game.findById(res.body.id);

        game.player1.should.eql(test_user._id);
        game.player2.should.eql('ai');
        game.state.should.eql('waiting_for_pieces');
    });

    it('should join an existing game', async function() {

        // Some other player is waiting in a game
        let game = new Game();
        game.player1 = 'some_waiting_player';
        game.state = 'waiting_for_an_opponent';
        await game.save();

        // Join that game
        const res = await api_request
                            .post('/api/games')
                            .send('{"ai": false}')
                            .expect(201);

        game = await Game.findById(res.body.id);

        game.player2.should.eql(test_user._id);
        game.state.should.eql('waiting_for_pieces');
    });
});
