var mongoose = require('mongoose');


/**
 * Coordinate
 */

var coordinateSchema = new mongoose.Schema({
    row: {type: Number, min: 0, max: 9, required: true},
    column: {type: Number, min: 0, max: 9, required: true}
});

/**
 * Action
 */
var actionSchema = new mongoose.Schema({
    type: {type: String, required: true, enum: ['reveal', 'destroy', 'move']},
    square: {type: coordinateSchema, required: true}
});

/**
 * Game
 */
var gameSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  player1: { type: String, required: true, ref: 'User'},
  player2: { type: String, required: true, ref: 'User'},
  is_vs_ai: {type: Boolean, required: true},
  winner: { type: String, required: true, ref: 'User'},
  state: { type: String, enum: [
        'waiting_for_an_opponent',
        'waiting_for_pieces',
        'started',
        'game_over',
        ]},
  board: {
    type: [[]],
    required: true,
    validate: [validateBoard, "{PATH} is not a valid board"]
  },
  actions: {type: [actionSchema], required: true }
});

/**
 * Find games involving a User
 */
gameSchema.query.findWithUser = function(user) {
  return this.find({$or: [{player1: user}, {player2: user}]});
};

function validateBoard() {
    // TODO
    return false;
}

mongoose.model('Game', gameSchema);
mongoose.model('Action', actionSchema);
mongoose.model('Coordinate', coordinateSchema);


