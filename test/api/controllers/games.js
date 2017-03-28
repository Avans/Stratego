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
            return apify_request(request.post(apify_url(url)));
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

    it('should give an error when the api_key is unknown', async function() {
        const res = await request.get(SOME_API + '?api_key=nonexistingapikey').expect(403);

        res.body.should.eql({
            message: 'De API key "nonexistingapikey" is niet bekend'
        });
    })
});

describe('GET /api/games', function() {

    it('should return no games', async function() {
        const res = await api_request.get('/api/games').expect(200);

        res.body.should.eql([]);
      });

    it('should return a game as player 1', async function() {
        let game = new Game();
        game._id = TEST_GAME_ID;
        game.player1 = test_user._id;
        game = await game.save()

        const res = await api_request.get('/api/games').expect(200);

        /*res.body.should.eql([{
            "id": "4F6tY",
            "state": "waiting_for_opponent"
        }]);*/
    });


});
