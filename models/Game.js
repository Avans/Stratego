const mongoose = require('mongoose');
const randomstring = require('randomstring');
const util = require('util');

const HttpError = require('../helpers/HttpError');
const ValidationError = require('../helpers/ValidationError');
const PieceType = require('./PieceType');


/**
 * Coordinate
 */

var coordinateSchema = new mongoose.Schema({
    row: {type: Number, min: 0, max: 9, required: true},
    column: {type: Number, min: 0, max: 9, required: true}
});

function Piece() {

}

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
  player1_turn: {type: String, required: true, type: Boolean, default: true},
  player1_set_up_pieces: {type: String, required: true, type: Boolean, default: false},
  player2_set_up_pieces: {type: String, required: true, type: Boolean, default: false},
  start_board: {
    type: [[String]],
    validate: [validateBoard, "{PATH} is not a valid board"],
    default: undefined
  },
  board: {
    type: [[String]],
    validate: [validateBoard, "{PATH} is not a valid board"],
    default: [[' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
              [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
              [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
              [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
              [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
              [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
              [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
              [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
              [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
              [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']]
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

/**
 * Get a rotated version of the board
 */
gameSchema.statics.getRotatedBoard = function(b) {
    const board = JSON.parse(JSON.stringify(b)); // Copy array
    board.map((v) => v.reverse());
    board.reverse();
    return board;
}

gameSchema.statics.getAIStartBoard = function() {
    return [['7', 'B', '5', '2', '9', '9', '1', '8', '9', 'B'],
            ['B', '7', '9', 'S', '4', '5', '8', '5', '3', '9'],
            ['7', 'B', '4', '8', '6', '4', '3', '8', '7', '6'],
            ['B', 'F', 'B', '5', '9', '6', '6', '9', '9', '8']];
}

gameSchema.methods.isVsAI = function() {
    return this.player2 === 'ai';
}

/**
 * Add the start board
 */
gameSchema.methods.setUpStartBoard = function(user_id, start_board) {
    gameSchema.statics.validateStartBoard(start_board);

    // User should be a part of this game
    if(user_id !== this.player1 && user_id !== this.player2) {
        throw new ValidationError('Only users that are participating in this game can set up a start board');
    }

    // Game should be in a state where the players are setting up the pieces
    if(this.state !== gameSchema.statics.STATE.WAITING_FOR_PIECES) {
        throw new ValidationError('The start board can only be added when the game is in the state waiting_for_pieces.');
    }


    if(    (user_id === this.player1 && this.player1_set_up_pieces)
        || (user_id === this.player2 && this.player2_set_up_pieces)) {
        throw new ValidationError('The board has already been set up for user %s', user_id);
    }


    if(user_id === this.player1) {
        // Add player1 pieces to the bottom of the board
        this.board[6] = start_board[0].map((v) => '1:' + v);
        this.board[7] = start_board[1].map((v) => '1:' + v);
        this.board[8] = start_board[2].map((v) => '1:' + v);
        this.board[9] = start_board[3].map((v) => '1:' + v);
        this.markModified('board');

        this.player1_set_up_pieces = true;
    } else {
        // Add player2 pieces to the top of the board
        let board = gameSchema.statics.getRotatedBoard(this.board);
        board[6] = start_board[0].map((v) => '2:' + v);
        board[7] = start_board[1].map((v) => '2:' + v);
        board[8] = start_board[2].map((v) => '2:' + v);
        board[9] = start_board[3].map((v) => '2:' + v);
        board = gameSchema.statics.getRotatedBoard(board);

        this.board = board;
        this.markModified('board');

        this.player2_set_up_pieces = true;
    }
}

gameSchema.methods.getPieceType = function(x, y) {
    const value = this.board[y][x];
    if(value == ' ') {
        return null;
    }

    return PieceType.getByCode(value[2]);
}

/**
 * Check if the move is valid in Stratego
 */
gameSchema.methods.checkValidMove = function(from_x, from_y, to_x, to_y) {
    // Check if coordinates are in bounds
    if(from_x < 0 || from_x > 9 || from_y < 0 || from_y > 9) {
        throw new ValidationError(util.format('The square_from coordinates (%d,%d) are not within the game grid', from_x, from_y));
    }

    if(to_x < 0 || to_x > 9 || to_y < 0 || to_y > 9) {
        throw new ValidationError(util.format('The square_to coordinates (%d,%d) are not within the game grid', to_x, to_y));
    }

    // Check if there IS a piece at the coordinate

    // Check if coordinate from/to are different

    // Check if piece is immobile

    // Check if not moving into own pieces

    // Check if move is not diagonal

    // Check if not moving into water

    // Check if not moving into own piece

    // Scout: Check if not jumping over water/other pieces

    // Other: Check that move is at most 1 far
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
