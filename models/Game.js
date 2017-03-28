var mongoose = require('mongoose');
var randomstring = require('randomstring');

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
    type: {type: String, required: true, enum: ['reveal_piece', 'destroy_piece', 'move_piece']},
    square: {type: coordinateSchema, required: true}
});

/**
 * Game
 */
var gameSchema = new mongoose.Schema({
  _id: { type: String, required: true, index: true, unique: true, default: () => randomstring.generate(5) },
  player1: { type: String, required: true, ref: 'User'},
  player2: { type: String, ref: 'User'},
  is_vs_ai: {type: Boolean},
  winner: { type: String, ref: 'User'},
  state: { type: String, required: true, default: 'waiting_for_an_opponent', enum: [
        'waiting_for_an_opponent',
        'waiting_for_pieces',
        'started',
        'game_over',
        ]},
  start_board: {
    type: [[String]],
    validate: [validateBoard, "{PATH} is not a valid board"],
    default: undefined
  },
  current_board: {
    type: [[String]],
    validate: [validateBoard, "{PATH} is not a valid board"],
    default: undefined
  },
  actions: {type: [actionSchema], default: []}
});

/**
 * Find games involving a User
 */
gameSchema.query.findWithUser = function(user) {
    return this.find({$or: [{player1: user}, {player2: user}]});
};

function validateBoard() {
    // TODO
    return true;
}

mongoose.model('Game', gameSchema);
mongoose.model('Action', actionSchema);
mongoose.model('Coordinate', coordinateSchema);
