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
  player1: { type: String, required: true },
  player2: String,
  is_vs_ai: {type: Boolean, required: true},
  winner: String,
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

function validateBoard() {
    // TODO
    return false;
}

mongoose.model('Game', gameSchema);
mongoose.model('Action', actionSchema);
mongoose.model('Coordinate', coordinateSchema);


