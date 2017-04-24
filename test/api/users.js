var expect = require('chai').expect;
var server = require('../../app');
var request = require('supertest')(server);

var mongoose = require('mongoose');
var User = mongoose.model('User');


const API_KEY = 'TEST_API_KEY';
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
            return apify_request(request.del(apify_url(url)));
        }
    };
}();

/**
 * Ensure that the environment is the same by resetting the database for each test
 */
beforeEach(async function() {
    await User.remove();

    test_user = new User();
    test_user._id = 'test_id';
    test_user.name = 'Test User';
    test_user.api_key = API_KEY;
    await test_user.save();
});

/**
 * GET /api/users/me
 */
describe('GET /users/me', function() {

    it('should give information for the current user', async function() {
        const res = await api_request
            .get('/api/users/me')
            .expect(200);

        expect(res.body).to.deep.eql({
            id: 'test_id',
            name: 'Test User'
        });
    });
});

