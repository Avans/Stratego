'use strict';

var swagger = require('swagger-express-middleware');
var express = require('express');
var session = require('express-session');
var YAML = require('yamljs');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

// Data Access Layer
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.DB_CONNECTION || 'mongodb://localhost:27017/stratego');
require('./models/Game');
require('./models/User');

module.exports = app;

app.use(session({secret: 'secret', resave: true, saveUninitialized: true}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Authenticate the user
app.use('/api', function(req, res, next) {
    var api_key = req.query.api_key;

    if(!api_key) {
        return req.res.status(403).json({message: 'Geef via de URL je api_key mee'})
    }
    mongoose.model('User').findOne({'api_key': api_key}, function(err, user) {
        if(err || !user) {
            return req.res.status(403).json({message: 'De API key "' + api_key + '" is niet bekend'})
        }
        // Log de user in
        req.user = user;
        next();
    });
});

app.use('/static', express.static('static'));

require('./api_key')(app);

swagger('./api/swagger/swagger.yaml', app, function(err, swagger) {
    if (err) { throw err; }
    app.use(
        swagger.metadata(),
        swagger.CORS(),
        swagger.files(),
        swagger.parseRequest(),
        swagger.validateRequest()
    );

    var games_game = require('./api/controllers/games_game');
    app.get('/api/games/:id', games_game.get);
    app.delete('/api/games/:id', games_game.delete);
    app.post('/api/games/:id/start_board', games_game.post_start_board);

    var games = require('./api/controllers/games');
    app.get('/api/games', games.get);
    app.post('/api/games', games.post);
    app.delete('/api/games', games.delete);

    // API documentatie
    var swaggerUi = require('swagger-ui-express');
    app.use('/', swaggerUi.serve, swaggerUi.setup(YAML.load('./api/swagger/swagger.yaml')));

    // Show errors
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.json({message: err.message});
        if(!err.status) {
            console.error(err);
        }
    });

    app.listen(process.env.PORT || 3000);
});
