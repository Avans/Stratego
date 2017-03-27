'use strict';

var SwaggerExpress = require('swagger-express-mw');
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

var config = {
  appRoot: __dirname,
  swaggerSecurityHandlers: {
    api: function (req, authOrSecDef, api_key, cb) {
        if(!api_key) {
            return req.res.status(403).json({message: 'Geef via de URL je api_key mee'})
        }
        mongoose.model('User').findOne({'api_key': api_key}, function(err, user) {
            if(err || !user) {
                return req.res.status(403).json({message: 'De API key "' + api_key + '" is niet bekend'})
            }
            // Log de user in
            req.user = user;
            return cb();
        });
    }
  }
};

app.use(session({secret: 'secret', resave: true, saveUninitialized: true}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/static', express.static('static'));

require('./api_key')(app);

SwaggerExpress.create(config, function(err, swaggerExpress) {
  if (err) { throw err; }

  // install middleware
  swaggerExpress.register(app);

  // API documentatie
  var swaggerUi = require('swagger-ui-express');
  app.use('/', swaggerUi.serve, swaggerUi.setup(YAML.load('./api/swagger/swagger.yaml')));

  app.listen(process.env.PORT || 3000);
});
