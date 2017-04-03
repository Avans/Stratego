const mongoose = require('mongoose');
const randomstring = require('randomstring');
const util = require('util');

const HttpError = require('../helpers/HttpError');
const ValidationError = require('../helpers/ValidationError');
const PieceType = require('./PieceType');

const coordinateType = { row: {type: Number, min: 0, max: 9, required: true},
                         column: {type: Number, min: 0, max: 9, required: true} };

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
  player1s_turn: {type: String, required: true, type: Boolean, default: true},
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
  actions: {type: [
        {
            type: {type: String, required: true, enum: ['reveal_piece', 'destroy_piece', 'move_piece']},
            square: {type: coordinateType, required: true},
            square_to: {type: coordinateType},
        }
    ]}
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
    this.notifyStateChange();
}

gameSchema.methods.notifyStateChange = function() {
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

gameSchema.statics.rotateActions = function(actions) {
    for(let i = 0; i < actions.length; i++) {
        actions[i].square.row = 9 - actions[i].square.row;
        actions[i].square.column = 9 - actions[i].square.column;

        if(actions[i].hasOwnProperty('square_to')) {
            actions[i].square_to.row = 9 - actions[i].square_to.row;
            actions[i].square_to.column = 9 - actions[i].square_to.column;
        }
    }
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
    if(value === ' ') {
        return null;
    }

    return PieceType.getByCode(value[2]);
}

gameSchema.methods.getPlayerNumberOfPiece = function(x, y) {
    const value = this.board[y][x];
    if(value == ' ') {
        return null;
    }

    if(value[0] === '1') {
        return 1;
    }
    if(value[0] === '2') {
        return 2;
    }
}

/**
 * Check if a coordinate is water
 */
gameSchema.methods.isWater = function(x, y) {
    return (y == 4 || y == 5) && (x == 2 || x == 3 || x == 6 || x == 7);
}

/**
 * Check if the move is valid in Stratego
 */
gameSchema.methods.checkValidMove = function(from_x, from_y, to_x, to_y) {
    const from = {column: from_x, row: from_y};
    const to = {column: to_x, row: to_y};

    // Check if coordinates are in bounds
    if(from_x < 0 || from_x > 9 || from_y < 0 || from_y > 9) {
        throw new ValidationError(util.format('The square_from coordinates %j are not within the game grid', from));
    }

    if(to_x < 0 || to_x > 9 || to_y < 0 || to_y > 9) {
        throw new ValidationError(util.format('The square_to coordinates %j are not within the game grid', to));
    }

    // Check if there IS a piece at the coordinate
    const pieceType = this.getPieceType(from_x, from_y);
    if(pieceType === null) {
        throw new ValidationError(util.format('There is no piece present at coordinate %j', from));
    }

    // Check if coordinate from/to are different
    if(from_x === to_x && from_y === to_y) {
        throw new ValidationError(util.format('The square_from coordinate %j can not be the same as the square_to coordinate %j', from, to));
    }

    // Check if piece is immobile
    if(pieceType === PieceType.TYPES.BOMB
        || pieceType === PieceType.TYPES.FLAG) {
        throw new ValidationError(util.format('The %s piece at %j cannot move', pieceType, from));
    }

    // Check if not moving into own pieces
    const playerFrom = this.getPlayerNumberOfPiece(from_x, from_y);
    const playerTo = this.getPlayerNumberOfPiece(to_x, to_y);
    if(playerFrom !== ' ' && playerFrom == playerTo) {
        throw new ValidationError(util.format('There already is a piece you control at %j', to));
    }

    // Check if move is not diagonal
    if(from_x !== to_x && from_y !== to_y) {
        throw new ValidationError(util.format('From %j to %j is a diagonal move, this is not allowed', from, to));
    }

    // Check if not moving into water
    if(this.isWater(to_x, to_y)) {
        throw new ValidationError(util.format('You can\'t move into %j, this is a water square', to));
    }


    if(pieceType === PieceType.TYPES.SCOUT) {
        // Check that the scout doesn't jump over water or other pieces
        function checkSpaceIsFree(x, y) {
            const space = {row: y, column: x};

            if(this.isWater(x, y)) {
                throw new ValidationError(util.format('The scout can\t move from %j to %j because there is a water piece at %j', from, to, space));
            }
            const piece = this.getPieceType(x, y);
            if(piece !== null) {
                throw new ValidationError(util.format('The scout can\t move from %j to %j because there is a %s at %j', from, to, piece, space));
            }
        }

        if(from_y === to_y) {
            // Horizontal check
            const low_x = Math.min(from_x, to_x);
            const high_x = Math.max(from_x, to_x);
            for(let x = low_x + 1; x < high_x; x += 1) {
                checkSpaceIsFree.bind(this)(x, to_y);
            }
        } else {
            // Vertical check
            const low_y = Math.min(from_y, to_y);
            const high_y = Math.max(from_y, to_y);
            for(let y = low_y + 1; y < high_y; y += 1) {
                checkSpaceIsFree.bind(this)(to_x, y);
            }
        }
    } else {
        // Only allow 1 space movement
        if(Math.abs((from_y - to_y) + (from_x - to_x)) !== 1) {
            throw new ValidationError(util.format('Piece %s can only move 1 space, cannot move from %j to %j', pieceType, from, to));
        }
    }

    // Other: Check that move is at most 1 far
}

gameSchema.methods.getPlayerNumber = function(user) {
    if(user === this.player1) {
        return 1;
    }
    if(user === this.player2) {
        return 2;
    }
    return null;
}

gameSchema.methods.getPlayerTurn = function() {
    if(this.player1s_turn) {
        return 1;
    } else {
        return 2;
    }
}

/**
 * Get a move for the AI to do
 */
gameSchema.methods.getAIMove = function() {
    // Check that match is against AI

    const valid_moves = [];

    function checkMoveTo(from_x, from_y, to_x, to_y) {
        try {
            this.checkValidMove(from_x, from_y, to_x, to_y);
            valid_moves.push({
                square: {row: from_y, column: from_x},
                square_to: {row: to_y, column: to_x}
            });
        } catch(e) { // Ignore that move
        }
    }

    // Go through all pieces of the AI
    for(let x = 0; x < 10; x += 1) {
        for(let y = 0; y < 10; y += 1) {

            if(this.getPlayerNumberOfPiece(x, y) === 2) {
                // Check if we can move to the surrounding squares
                checkMoveTo.bind(this)(x, y, x + 1, y);
                checkMoveTo.bind(this)(x, y, x - 1, y);
                checkMoveTo.bind(this)(x, y, x, y + 1);
                checkMoveTo.bind(this)(x, y, x, y - 1);
            }
        }
    }

    if(valid_moves.length === 0) {
        return null;
    }

    const random_move = valid_moves[Math.floor(Math.random() * valid_moves.length)];
    return random_move;
}

/**
 * Execute a move on the board
 */
gameSchema.methods.doMove = function(user, from_x, from_y, to_x, to_y) {
    const from = {column: from_x, row: from_y};
    const to = {column: to_x, row: to_y};

    // Check if the user participates in this game
    const playerNumber = this.getPlayerNumber(user);
    if(playerNumber === null) {
        throw new ValidationError(util.format('User %s does not participate in this game and thus cannot do a move', user));
    }

    // Game should be started
    switch(this.state) {
        case gameSchema.statics.STATE.STARTED:
            // This is good
            break;

        case gameSchema.statics.STATE.GAME_OVER:
            throw new ValidationError('Cannot do a move, the game is already finished');

        default:
            throw new ValidationError('Cannot do a move, the game hasn\'t started yet');
    }

    // Check if the user has the turn
    if(playerNumber !== this.getPlayerTurn()) {
        throw new ValidationError('Cannot do a move, it is not your turn');
    }

    // Validate the move
    this.checkValidMove(from_x, from_y, to_x, to_y);

    // Check if the piece belongs to the user
    if(this.getPlayerNumberOfPiece(from_x, from_y) !== playerNumber) {
        throw new ValidationError(util.format('The piece at %j cannot be moved by %s, it is controlled by the other user', from, user));
    }

    const actions = [];

    let move = true;

    // Do a battle (if landing on opponent piece)
    const pieceTypeMoving = this.getPieceType(from_x, from_y);
    const pieceTypeAtTarget = this.getPieceType(to_x, to_y);
    if(pieceTypeAtTarget !== null) {

        // Reveal the pieces
        actions.push({
            type: 'reveal_piece',
            square: from,
            piece: pieceTypeMoving.code
        });
        actions.push({
            type: 'reveal_piece',
            square: to,
            piece: pieceTypeAtTarget.code
        });

        // Destroy target piece
        if(pieceTypeMoving.canBeat(pieceTypeAtTarget)) {
            actions.push({
                type: 'destroy_piece',
                square: to
            });
            this.board[to_y][to_x] = ' ';
        }

        // Destroy moving piece if it loses (or draws)
        if(pieceTypeAtTarget.canBeat(pieceTypeMoving)) {
            actions.push({
                type: 'destroy_piece',
                square: from
            });
            this.board[from_y][from_x] = ' ';
            move = false;
        }
    }

    // Do the move
    if(move) {
        this.board[to_y][to_x] = this.board[from_y][from_x];
        this.board[from_y][from_x] = ' ';
        this.markModified('board');
    }
    actions.push({
        type: 'move_piece',
        square: from,
        square_to: to
    });

    // Change the turn
    this.player1s_turn = !this.player1s_turn;
    this.notifyStateChange();

    // If the flag is captured the game is over
    if(pieceTypeAtTarget === PieceType.TYPES.FLAG) {
        this.winner = (playerNumber == 1) ? this.player1 : this.player2;
        this.state = gameSchema.statics.STATE.GAME_OVER;
    }

    // Save actions to history
    for(let i = 0; i < actions.length; i += 1) {
        this.actions.push(actions[i]);
    }

    return actions;
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

