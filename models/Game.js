const mongoose = require('mongoose');
const randomstring = require('randomstring');
const HttpError = require('../helpers/HttpError');
const ValidationError = require('../helpers/ValidationError');
const util = require('util');

/**
 * Coordinate
 */

var coordinateSchema = new mongoose.Schema({
    row: {type: Number, min: 0, max: 9, required: true},
    column: {type: Number, min: 0, max: 9, required: true}
});

function Piece() {

}


function PieceType(code, name, number_per_player) {
    this.code = code;
    this.name = name;
    this.number_per_player = number_per_player;

    this.toString = function() {
        return util.format("%s ('%s')", name, code);
    }

    Object.freeze(this);
}

PieceType.getByCode = function(code) {
    for(var key in PieceType.TYPES) {
        if(PieceType.TYPES[key].code === code) {
            return PieceType.TYPES[key];
        }
    }
    return null;
}

PieceType.getCodes = function(code) {
    return Object.values(PieceType.TYPES)
                 .map((piecetype) => piecetype.code);
}

PieceType.TYPES = Object.freeze({
    BOMB: new PieceType('B', 'Bomb', 6),
    MARSHAL: new PieceType('1', 'Marshal', 1),
    GENERAL: new PieceType('2', 'General', 1),
    COLONEL: new PieceType('3', 'Colonel', 2),
    MAJOR: new PieceType('4', 'Major', 3),
    CAPTAIN: new PieceType('5', 'Captain', 4),
    LIEUTENANT: new PieceType('6', 'Lieutenant', 4),
    SERGEANT: new PieceType('7', 'Sergeant', 4),
    MINER: new PieceType('8', 'Miner', 5),
    SCOUT: new PieceType('9', 'Scout', 8),
    SPY: new PieceType('S', 'Spy', 1),
    FLAG: new PieceType('F', 'Flag', 1)
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
  winner: { type: String, ref: 'User'},
  state: { type: String, required: true, default: 'waiting_for_an_opponent', enum: [
        'waiting_for_an_opponent',
        'waiting_for_pieces',
        'started',
        'game_over',
        ]},
  player1_set_up_pieces: {type: String, required: true, type: Boolean, default: false},
  player2_set_up_pieces: {type: String, required: true, type: Boolean, default: false},
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
  actions: {type: [actionSchema]}
});

gameSchema.statics.STATE = {
  WAITING_FOR_AN_OPPONENT: 'waiting_for_an_opponent',
  WAITING_FOR_PIECES: 'waiting_for_pieces',
  STARTED: 'started',
  GAME_OVER: 'game_over'
}

/**
 * Find games involving a User
 */
gameSchema.query.findWithUser = function(user) {
    return this.find({$or: [{player1: user}, {player2: user}]});
};

/**
 * Find a game by id, only if a user is playing in it
 */
gameSchema.statics.findByIdAndUser = async function(id, user) {
    var games = await this.find({_id: id}).findWithUser(user);

    if(games.length === 0) {
        throw new HttpError(404, 'De game met het id "' + id + '" bestaat niet, of doe je niet aan mee.');
    } else {
        return games[0];
    }
}

gameSchema.methods.setState = function(state) {
  this.state = state;
  // TODO: emit with sockets
}

/**
 * Check if the board is a valid Stratego start board (4x10 array with strings)
 */
gameSchema.statics.validateStartBoard = function(start_board) {
    if(!Array.isArray(start_board)) {
        throw new ValidationError('Start board should be an array');
    }

    if(start_board.length !== 4) {
        throw new ValidationError(util.format('Start board should be an array of length 4, got an array of length %d', start_board.length));
    }

    // Validate rows
    for(let row_i = 0; row_i < 4; row_i += 1) {
        const row = start_board[row_i];

        if(!Array.isArray(row)) {
            throw new ValidationError(util.format('Start board index %d: expected an array but got %s', row_i, row));
        }

        if(row.length !== 10) {
            throw new ValidationError(util.format('Start board index %d: expected an array of length 10, got an array of length %d', row_i, row.length));
        }

        // Validate values in row
        for(let column_i = 0; column_i < 10; column_i += 1) {
            const piece = row[column_i];

            if(typeof piece !== 'string') {
                throw new ValidationError(util.format('Start board index %d,%d: expected a string but got %s', row_i, column_i, piece))
            }

            if(PieceType.getByCode(piece) === null) {
                throw new ValidationError(util.format('Start board index %d,%d: expected one of %s but got "%s"', row_i, column_i, PieceType.getCodes(), piece));
            }
        }
    }

    // Keep track how many times a piece appears
    const counts = {};
    const codes = PieceType.getCodes();
    for(let i = 0; i < codes.length; i += 1) {
        counts[codes[i]] = 0;
    }

    // Count the pieces
    for(let row_i = 0; row_i < 4; row_i += 1) {
        for(let column_i = 0; column_i < 10; column_i += 1) {
            const code = start_board[row_i][column_i];
            counts[code] += 1;
        }
    }

    // Check if each piece appears the correct number of time
    for(let i = 0; i < codes.length; i+= 1) {
        const code = codes[i];
        const piece_type = PieceType.getByCode(code);
        const number_of_appearances = counts[code];

        if(number_of_appearances !== piece_type.number_per_player) {
            throw new ValidationError(util.format('The %s piece type should appear %d times, but seems to appear %d times on the start board', piece_type, piece_type.number_per_player, number_of_appearances));
        }
    }
}

gameSchema.statics.getRotatedBoard = function(board) {

}

gameSchema.methods.isVsAI = function() {
    return this.player2 === 'ai';
}

/**
 * Add the start board
 */
gameSchema.methods.setUpStartBoard = function(user, start_board) {
    this.validateStartBoard(start_board);
    // TODO
}

/**
 *
 */
gameSchema.methods.outputForUser = function(user) {
    const returnValue = {};

    returnValue.id = this._id;


    return returnValue;
};

function validateBoard() {
    // TODO
    return true;
}

mongoose.model('Game', gameSchema);
mongoose.model('Action', actionSchema);
mongoose.model('Coordinate', coordinateSchema);
