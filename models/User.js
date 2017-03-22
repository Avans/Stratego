var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  _id: {type: String, required: true, unique: true, index: true},
  name: { type: String, required: true },
  api_key: { type: String, required: true },
});

module.exports = mongoose.model('User', userSchema);