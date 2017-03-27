var should = require('should');
var server = require('../../../app');
var request = require('supertest')(server);
var async = require('async');

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Game = mongoose.model('Game');


const API_KEY = 'TEST_API_KEY';

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
beforeEach(function(done) {
    async.waterfall([
        // Remove old games and users
        function(done) {
            User.remove({}, done);
        },
        function(err, done) {
            Game.remove({}, done);
        },

        // Set up a test user
        function(err, done) {
            var user = new User();
            user._id = 'test_id';
            user.name = 'Test User';
            user.api_key = API_KEY;
            user.save(done);
        },
    ], done);
});

/**
 * Test API key checks
 */
describe('api_key checks', function() {
    const SOME_API = '/api/games';

    it('should give an error when the api_key is missing', function(done) {
        request
          .get(SOME_API)
          .expect(403)
          .end(function(err, res) {
              res.body.should.eql({
                message: 'Geef via de URL je api_key mee'
              });
              done();
          })
    });

    it('should give an error when the api_key is unknown', function(done) {
      request
          .get(SOME_API + '?api_key=nonexistingapikey')
          .expect(403)
          .end(function(err, res) {
              res.body.should.eql({
                message: 'De API key "nonexistingapikey" is niet bekend'
              })
              done();
          })
    })
});

describe('GET /api/games', function() {

    //it('it should', function(done) {

        /*request(server)
          .get('/api/games')
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);

            res.body.should.eql([]);

            done();
          });
      });*/

});
