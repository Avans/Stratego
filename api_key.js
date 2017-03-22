'use strict';

var randomstring = require('randomstring');
var mongoose = require('mongoose');
var User = mongoose.model('User');

module.exports = function(app) {

    /**
     * Configure passport
     */
    var passport = require('passport');

    passport.serializeUser(function(user, done) {
        done(null, user._id);
    });
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    var AvansStrategy = require('passport-avans').Strategy;
    passport.use(new AvansStrategy({
        consumerKey: '201cb65cc4f38f60d4f35e677dd5d119a12d9294',
        consumerSecret: '2c9cbe2064fa43d9b57fb47982de3d986f319eda',
        callbackURL: '/api_key/callback'
      },
      function(token, tokenSecret, profile, done) {
          User.findById(profile.id, function(err, user) {
              if(user)
              {
                  done(null, user);
              }
              else
              {
                  var user = new User();
                  user._id =  profile.id;
                  user.name =  profile.nickname;
                  user.api_key = randomstring.generate();
                  user.save(function(err, user){
                      done(null, user);
                  });
              }
          });
      }
    ));

    /**
    * Configure App
    */
    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/api_key', function(req, res) {
        if(!req.user) {
            return res.redirect('/api_key/login')
        }
        res.json({user: req.user});
    });
    app.get('/api_key/login', passport.authenticate('avans'))
    app.get('/api_key/callback', passport.authenticate('avans', { successRedirect: '/api_key', failureRedirect: '/api_key/login' }));
};