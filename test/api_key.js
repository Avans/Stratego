const expect = require('chai').expect;
const should = require('should');
const app = require('../app');

const api_key = require('../api_key');
const mongoose = require('mongoose');
const User = mongoose.model('User');

/**
 * API key stuff
 *
 * Yes, this is mainly just to brag 100% code coverage
 */
describe('api_key', function() {
    // Example profile
    let profile;

    beforeEach(async function() {
        profile = {
            nickname: "Test User",
            id: "test_id"
        }
    });

    let test_user;
    beforeEach(async function() {
        await User.remove();

        test_user = new User();
        test_user._id = 'test_id';
        test_user.name = 'Test User';
        test_user.api_key = 'test_api_key';
        await test_user.save();
    });

    it('should give the ._id property for serializeUser()', function(done) {
        api_key.serializeUser(test_user, function(err, userId) {
            should.not.exist(err);
            userId.should.equal('test_id');
            done();
        })
    });

    it('should find the user for deserializeUser()', function(done) {
        api_key.deserializeUser('test_id', function(err, user) {
            should.not.exist(err);
            user._id.should.equal('test_id');
            done();
        });
    });

    it('should return existing user for Strategy', function(done) {
        api_key.getUserStrategy('', '', profile, function(err, user) {
            user._id.should.equal('test_id');

            User.count(function(err, c) {
                c.should.equal(1);
                done();
            });
        });
    });

    it('should create new user for Strategy', function(done) {
        profile.id = 'someone_else';
        api_key.getUserStrategy('', '', profile, function(err, user) {
            user._id.should.equal('someone_else');

            User.count(function(err, c) {
                c.should.equal(2);
                done();
            });
        });
    });


});
