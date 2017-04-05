const expect = require('chai').expect;
const should = require('should');
const app = require('../app');

const api_key = require('../api_key');
const mongoose = require('mongoose');
const User = mongoose.model('User');

/**
 * API key
 */
describe('serializeUser()', function() {
    let test_user;
    beforeEach(async function() {
        await User.remove();

        test_user = new User();
        test_user._id = 'test_id';
        test_user.name = 'Test User';
        test_user.api_key = 'test_api_key';
        await test_user.save();
    });

    it('should give the ._id property', function(done) {
        api_key.serializeUser(test_user, function(err, userId) {
            should.not.exist(err);
            userId.should.equal('test_id');
            done();
        })
    });
});
