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
mongoose.connect(process.env.DB_CONNECTION || 'mongodb://localhost:27017/stratego');
require('./models/Game');
require('./models/User');

module.exports = app;

var config = {
  appRoot: __dirname
};

//app.use(logger('dev'));
app.use(session({secret: 'secret', resave: true, saveUninitialized: true}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/static', express.static('static'));

require('./api_key')(app);

// API documentatie
var swaggerUi = require('swagger-ui-express');
app.use('/', swaggerUi.serve, swaggerUi.setup(YAML.load('./api/swagger/swagger.yaml')));


SwaggerExpress.create(config, function(err, swaggerExpress) {
  if (err) { throw err; }

  swaggerExpress.register(app);
  app.listen(process.env.PORT || 3000);
});
