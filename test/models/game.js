var should = require('should');
var expect = require('chai').expect;
var app = require('../../app');
var ValidationError = require('../../helpers/ValidationError');

var mongoose = require('mongoose');
var Game = mongoose.model('Game');
var User = mongoose.model('User');


/**
 * Test API key checks
 */
describe('Game.outputForUser()', function() {
    let game;

    beforeEach(async function() {
        game = new Game();
        game._id = 'game_id';
        game.player1 = 'test_user';
        game.player2 = 'someone_else';
        game.board = [['1:4', '2:6', ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ']];
        game.start_board = JSON.parse(JSON.stringify(game.board)); // Simple copy
        game.player1s_turn = true
        game.state = Game.STATE.STARTED;
    });

    it('should give game id', async function() {
        const output = game.outputForUser('test_user');
        output.id.should.equal('game_id');
    });

    it('should give the name of the opponent', async function() {
        let output = game.outputForUser('test_user');
        output.opponent.should.equal('someone_else');

        output = game.outputForUser('someone_else');
        output.opponent.should.equal('test_user');

        game.state = Game.STATE.WAITING_FOR_AN_OPPONENT;
        output = game.outputForUser('someone_else');
        output.hasOwnProperty('opponent').should.be.false();
    });

    it('should give winner information', async function() {
        let output = game.outputForUser('test_user');
        output.hasOwnProperty('winner').should.be.false();

        game.winner = 'test_user';
        game.state = Game.STATE.GAME_OVER;
        output = game.outputForUser('test_user');
        output.winner.should.equal('test_user')
    });

    it('should give state information', async function() {
        let output = game.outputForUser('test_user');
        output.state.should.equal('my_turn');

        output = game.outputForUser('someone_else');
        output.state.should.equal('opponent_turn');

        game.state = Game.STATE.WAITING_FOR_PIECES;
        output = game.outputForUser('test_user');
        output.state.should.equal('waiting_for_pieces');

        // Case where player2 has the pieces set up, but player1 hasn't
        game.player1_set_up_pieces = false;
        game.player2_set_up_pieces = true;
        output = game.outputForUser('test_user');
        output.state.should.equal('waiting_for_pieces');
        output = game.outputForUser('someone_else');
        output.state.should.equal('waiting_for_opponent_pieces');

        // Case where player1 has the pieces set up, but player2 hasn't
        game.player1_set_up_pieces = true;
        game.player2_set_up_pieces = false;
        output = game.outputForUser('test_user');
        output.state.should.equal('waiting_for_opponent_pieces');
        output = game.outputForUser('someone_else');
        output.state.should.equal('waiting_for_pieces');
    });

    it('should give board information', async function() {
        let output = game.outputForUser('test_user');

        expect(output.board).to.deep.equal(
                     [['4',   'O',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ']]);

        // Should give rotated view for player 2
        output = game.outputForUser('someone_else');
        expect(output.board).to.deep.equal(
                     [[' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   '6',   'O']]);
    });

    it('shouldn\'t give board information if the game hasn\'t started yet', async function() {
        game.state = Game.STATE.WAITING_FOR_AN_OPPONENT;
        let output = game.outputForUser('test_user');

        output.hasOwnProperty('board').should.be.false();
    });

    it('should give start_board information', async function() {
        let output = game.outputForUser('test_user');
        output.hasOwnProperty('start_board').should.be.true();

        // Don't add it when the game hasn't started yet
        game.start_board = undefined
        output = game.outputForUser('test_user');
        output.hasOwnProperty('start_board').should.be.false();
    });
});

/**
 * Test Game.validateBoard()
 */
describe('Game.validateStartBoard()', function() {
    let board;

    function resetCorrectBoard() {
        board =
            [['7', 'B', '5', '2', '9', '9', '1', '8', '9', 'B'],
             ['B', '7', '9', 'S', '4', '5', '8', '5', '3', '9'],
             ['7', 'B', '4', '8', '6', '4', '3', '8', '7', '6'],
             ['B', 'F', 'B', '5', '9', '6', '6', '9', '9', '8']];
    }

    beforeEach(async function() {
        resetCorrectBoard();
    });

    it('should validate a correct start board', async function() {
        Game.validateStartBoard.bind(Game, board).should.not.throw(ValidationError);
    });

    it('should only accept 4x10 string arrays', async function() {
        Game.validateStartBoard.bind(Game, '').should.throw(ValidationError);
        Game.validateStartBoard.bind(Game, true).should.throw(ValidationError);
        Game.validateStartBoard.bind(Game, []).should.throw(ValidationError);
        Game.validateStartBoard.bind(Game, [1, 2, 3, 4]).should.throw(ValidationError);
        Game.validateStartBoard.bind(Game, [[],[],[],[]]).should.throw(ValidationError);

        board[0][0] = true;
        Game.validateStartBoard.bind(Game, board).should.throw(ValidationError);
    });

    it('should only accept valid piece codes', async function() {

        board[2][7] = '7 ';
        Game.validateStartBoard.bind(Game, board).should.throw(ValidationError);

        resetCorrectBoard();
        board[1][2] = 'P';
        Game.validateStartBoard.bind(Game, board).should.throw(ValidationError);
    });

    it('should only accept a correct number of pieces per board', async function() {
        board[0][0] = 'B'; /// Extra flag
        Game.validateStartBoard.bind(Game, board).should.throw(ValidationError);

        resetCorrectBoard();
        board[3][1] = '1' // Overwrite flag
        Game.validateStartBoard.bind(Game, board).should.throw(ValidationError);

        // Swap two pieces
        resetCorrectBoard();
        var swap = board[0][0];
        board[0][0] = board[0][1];
        board[0][1] = swap;
        Game.validateStartBoard.bind(Game, board).should.not.throw(ValidationError);

    });
});

describe('Game.getAIStartBoard()', function() {
    it('should return a valid start board', async function() {
        const board = Game.getAIStartBoard();
        Game.validateStartBoard(board);
    });
});

/**
 * Test Game.checkValidMove()
 */
describe('Game.checkValidMove()', function() {
    const game = new Game();
    game.board = [['1:5', '1:7', ' ',   '1:9', ' ',   ' ',   '2:1', ' ',   ' ',   ' '],
                  ['2:6', ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                  [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                  [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                  [' ',   ' ',   ' ',   ' ',   ' ',   '2:3', ' ',   ' ',   ' ',   ' '],
                  [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                  [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   '1:5', ' ',   ' '],
                  [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                  [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   '2:3'],
                  ['1:F', '2:B', ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   '2:8']];

    it('should accept valid moves', async function() {
        game.checkValidMove(1, 0, 2, 0); // 7 moving right
        game.checkValidMove(0, 0, 0, 1); // 5 attacking 6
        game.checkValidMove(3, 0, 3, 2); // Scout (9) moving two down
        game.checkValidMove(3, 0, 6, 0); // Scout (9) attacking 1 to the right
    });

    it('should not accept coordinates outside the game grid', async function() {
        game.checkValidMove.bind(game, -1, 0, 0, 0).should.throw(ValidationError);
        game.checkValidMove.bind(game, 0, -1, 0, 0).should.throw(ValidationError);
        game.checkValidMove.bind(game, 9, 10, 9, 9).should.throw(ValidationError);
        game.checkValidMove.bind(game, 10, 9, 9, 9).should.throw(ValidationError);

        game.checkValidMove.bind(game, 0, 0, 0, -1).should.throw(ValidationError);
        game.checkValidMove.bind(game, 0, 0, -1, 0).should.throw(ValidationError);
        game.checkValidMove.bind(game, 9, 9, 10, 9).should.throw(ValidationError);
        game.checkValidMove.bind(game, 9, 9, 9, 10).should.throw(ValidationError);
    });

    it('should not be able to move an empty space', async function() {
        game.checkValidMove.bind(game, 5, 5, 5, 6).should.throw(ValidationError);
        game.checkValidMove.bind(game, 3, 6, 4, 6).should.throw(ValidationError);
    });

    it('should check that from/to coordinates differ', async function() {
        game.checkValidMove.bind(game, 0, 0, 0, 0).should.throw(ValidationError);
        game.checkValidMove.bind(game, 3, 0, 3, 0).should.throw(ValidationError);
        game.checkValidMove.bind(game, 9, 9, 9, 9).should.throw(ValidationError);
    });

    it('should give an error for moving bomb and flag pieces', async function() {
        game.checkValidMove.bind(game, 0, 9, 0, 8).should.throw(ValidationError);
        game.checkValidMove.bind(game, 1, 9, 1, 8).should.throw(ValidationError);
    });

    it('should give an error for moving into your own pieces', async function() {
        game.checkValidMove.bind(game, 0, 0, 1, 0).should.throw(ValidationError);
        game.checkValidMove.bind(game, 9, 9, 9, 8).should.throw(ValidationError);
    });

    it('should give an error for diagonal moves', async function() {
        game.checkValidMove.bind(game, 1, 0, 2, 1).should.throw(ValidationError);
        game.checkValidMove.bind(game, 9, 8, 8, 7).should.throw(ValidationError);
    });

    it('should give an error when trying to move into water', async function() {
        game.checkValidMove.bind(game, 5, 4, 6, 4).should.throw(ValidationError);
        game.checkValidMove.bind(game, 7, 6, 7, 5).should.throw(ValidationError);
    });

    it('should give an error if the scout tries to move over water/other pieces', async function() {
        game.checkValidMove.bind(game, 3, 0, 3, 9).should.throw(ValidationError);
        game.checkValidMove.bind(game, 3, 0, 9, 0).should.throw(ValidationError);
    });

    it('should give an error when trying to move a piece further than 1 space', async function() {
        game.checkValidMove.bind(game, 9, 9, 9, 7).should.throw(ValidationError);
        game.checkValidMove.bind(game, 7, 0, 9, 0).should.throw(ValidationError);
    });

    it('should catch a corrupt board', async function() {
      game.board[0][0] = '0:4';
      game.checkValidMove.bind(game, 0, 0, 0, 1).should.throw(Error);
    })
});

describe('Game.getAIMove()', function() {
    let game;
    beforeEach(async function() {
        game = new Game();
        game.player1 = 'test_user';
        game.player2 = 'ai';
        game.board = [['1:4', '2:6', ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ']];
        game.state = Game.STATE.STARTED;
    });

    it('should give a valid move for the AI', async function() {
        const move = game.getAIMove();
        move.square.should.eql({row: 0, column: 1});
    });

    it('should return null if there are no valid moves', async function() {
        game.board[0][1] = '2:F';
        const move = game.getAIMove();
        (move === null).should.eql(true); // This is weird, but other ways don't fail on undefined
    });
});

describe('Game.doMove()', function() {
    let game;

    beforeEach(async function() {
        game = new Game();
        game.player1 = 'test_user';
        game.player2 = 'someone_else';
        game.board = [['1:4', '2:6', ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
                      [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ']];
        game.player1s_turn = true;
        game.state = Game.STATE.STARTED;
    });

    it('should execute a valid player 1 move', async function() {
        const actions = game.doMove('test_user', 0, 0, 0, 1);

        // Expect correct actions returned
        actions.length.should.equal(1);
        expect(actions).to.deep.equal([{
            type: 'move_piece',
            square: { column: 0, row: 0 },
            square_to: { column: 0, row: 1 }
        }]);

        // Expect actions to be added to history
        game.actions.length.should.equal(1);

        // Expect move on the board to be completed
        game.board[0][0].should.equal(' ');
        game.board[1][0].should.equal('1:4');

        // Expect player 2 to have the turn
        game.player1s_turn.should.be.false();
    });

    it('should execute a valid player 2 move', async function() {
        game.player1s_turn = false;

        game.doMove('someone_else', 1, 0, 1, 1);

        game.board[0][1].should.equal(' ');
        game.board[1][1].should.equal('2:6');

        game.player1s_turn.should.be.true();
    });

    // should execute an attack
    it('should execute an attack', async function() {
        const actions = game.doMove('test_user', 0, 0, 1, 0); // Attack the 2:6 piece and win

        game.board[0][0].should.equal(' ');
        game.board[0][1].should.equal('1:4');

        expect(actions).to.deep.equal([
            { type: 'reveal_piece',
              square: {row: 0, column: 0},
              piece: '4'
            },
            { type: 'reveal_piece',
              square: {row: 0, column: 1},
              piece: '6'
            },
            { type: 'destroy_piece',
              square: {row: 0, column: 1}
            },
            { type: 'move_piece',
              square: {row: 0, column: 0},
              square_to: {row: 0, column: 1}
            }
        ]);
    });

    it('should destroy both pieces if they are equal', async function() {
        game.board[0][0] = '1:6';
        const actions = game.doMove('test_user', 0, 0, 1, 0);

        game.board[0][0].should.equal(' ');
        game.board[0][1].should.equal(' ');


        expect(actions).to.deep.equal([
            { type: 'reveal_piece',
              square: { column: 0, row: 0 },
              piece: '6'
            },
            { type: 'reveal_piece',
              square: { column: 1, row: 0 },
              piece: '6'
            },
            { type: 'destroy_piece',
              square: { column: 1, row: 0 }
            },
            { type: 'destroy_piece',
              square: { column: 0, row: 0 }
            }]);
    });

    it('should destroy the moving piece if it loses', async function() {
        game.board[0][0] = '1:9';

        game.doMove('test_user', 0, 0, 1, 0);

        game.board[0][0].should.equal(' ');
        game.board[0][1].should.equal('2:6');
    });

    it('should let spy win from the marshal', async function() {
        game.board[0][0] = '1:S';
        game.board[0][1] = '2:1';

        game.doMove('test_user', 0, 0, 1, 0);

        game.board[0][0].should.equal(' ');
        game.board[0][1].should.equal('1:S');
    });

    // should finish the game when the flag is captured
    it('should finish the game when the flag is captured', async function() {
        game.board[0][1] = '2:F';

        game.doMove('test_user', 0, 0, 1, 0);

        game.winner.should.equal('test_user');
        game.state.should.equal(Game.STATE.GAME_OVER);
    });

    it('should finish the game when player 2 captures the flag', async function() {
        game.board[0][0] = '1:F';
        game.player1s_turn = false;

        game.doMove('someone_else', 1, 0, 0, 0);

        game.winner.should.equal('someone_else');
        game.state.should.equal(Game.STATE.GAME_OVER);
    });

    it('should not allow a third user to do a move', async function() {
        game.doMove.bind(game, 'third_person', 0, 0, 0, 1).should.throw(ValidationError);
    });

    it('should only allow a move if the game is started', async function() {
        game.state = Game.STATE.GAME_OVER;
        game.doMove.bind(game, 'test_user', 0, 0, 0, 1).should.throw(ValidationError);

        game.state = Game.STATE.WAITING_FOR_PIECES;
        game.doMove.bind(game, 'test_user', 0, 0, 0, 1).should.throw(ValidationError);
    });

    it('should only allow a move if the user has the turn', async function() {
        game.doMove.bind(game, 'someone_else', 1, 0, 1, 1).should.throw(ValidationError);

        game.player1s_turn = false;
        game.doMove.bind(game, 'test_user', 0, 0, 0, 1).should.throw(ValidationError);
    });

    it('should not allow invalid moves', async function() {
        game.doMove.bind(game, 'test_user', 0, 0, 0, 2).should.throw(ValidationError);
    });

    it('should not allow moving an opponents piece', async function() {
        game.doMove.bind(game, 'test_user', 1, 0, 1, 1).should.throw(ValidationError);

        game.player1s_turn = false;
        game.doMove.bind(game, 'someone_else', 0, 0, 0, 1).should.throw(ValidationError);

    });
});

/**
 * Test Game.setUpStartBoard()
 */
describe('Game.setUpStartBoard()', function() {
    let test_user, game;
    let board = [['7', 'B', '5', '2', '9', '9', '1', '8', '9', 'B'],
                 ['B', '7', '9', 'S', '4', '5', '8', '5', '3', '9'],
                 ['7', 'B', '4', '8', '6', '4', '3', '8', '7', '6'],
                 ['B', 'F', 'B', '5', '9', '6', '6', '9', '9', '8']];

    beforeEach(async () => {
        await User.remove();
        await Game.remove();

        test_user = new User();
        test_user._id = 'test_user_id';
        test_user.api_key = 'a';
        test_user.name = 'a';
        test_user = await test_user.save();

        game = new Game();
        game.player1 = test_user._id;
        game.player2 = 'someone_else';
        game.state = 'waiting_for_pieces';
        game = await game.save();
    });

    it('should accept a board and save it', async function() {
        game.setUpStartBoard(test_user._id, board);
        expect(game.player1_set_up_pieces).to.be.true;
        expect(game.player2_set_up_pieces).to.be.false;
        expect(game.state).to.equal(Game.STATE.WAITING_FOR_PIECES);

        expect(JSON.stringify(game.board)).to.equal(JSON.stringify([
            [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
            [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
            [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
            [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
            [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
            [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
            ['1:7', '1:B', '1:5', '1:2', '1:9', '1:9', '1:1', '1:8', '1:9', '1:B'],
            ['1:B', '1:7', '1:9', '1:S', '1:4', '1:5', '1:8', '1:5', '1:3', '1:9'],
            ['1:7', '1:B', '1:4', '1:8', '1:6', '1:4', '1:3', '1:8', '1:7', '1:6'],
            ['1:B', '1:F', '1:B', '1:5', '1:9', '1:6', '1:6', '1:9', '1:9', '1:8']]));
    });

    it('should accept a board as player 2 and save it', async function() {
        game.player1 = 'someone_else';
        game.player2 = test_user._id;

        game.setUpStartBoard('someone_else', board);
        game.setUpStartBoard(test_user._id, board);

        expect(game.player2_set_up_pieces).to.be.true;

        expect(JSON.stringify(game.board)).to.equal(JSON.stringify([
            ['2:8', '2:9', '2:9', '2:6', '2:6', '2:9', '2:5', '2:B', '2:F', '2:B'],
            ['2:6', '2:7', '2:8', '2:3', '2:4', '2:6', '2:8', '2:4', '2:B', '2:7'],
            ['2:9', '2:3', '2:5', '2:8', '2:5', '2:4', '2:S', '2:9', '2:7', '2:B'],
            ['2:B', '2:9', '2:8', '2:1', '2:9', '2:9', '2:2', '2:5', '2:B', '2:7'],
            [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '  ],
            [' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '  ],
            ['1:7', '1:B', '1:5', '1:2', '1:9', '1:9', '1:1', '1:8', '1:9', '1:B'],
            ['1:B', '1:7', '1:9', '1:S', '1:4', '1:5', '1:8', '1:5', '1:3', '1:9'],
            ['1:7', '1:B', '1:4', '1:8', '1:6', '1:4', '1:3', '1:8', '1:7', '1:6'],
            ['1:B', '1:F', '1:B', '1:5', '1:9', '1:6', '1:6', '1:9', '1:9', '1:8']]));
    });

    it('should give an error if the user doesn\'t participate', async function() {
        game.player1 = 'some_guy';
        game.setUpStartBoard.bind(game, test_user._id, board).should.throw(ValidationError);
    });

    it('should give an error if the game isn\'t in the state waiting_for_pieces', async function() {
        game.state = 'started';
        game.setUpStartBoard.bind(game, test_user._id, board).should.throw(ValidationError);

        game.state = 'waiting_for_an_opponent';
        game.setUpStartBoard.bind(game, test_user._id, board).should.throw(ValidationError);
    });

    it('should give an error if the user already set up the board', async () => {
        game.player1_set_up_pieces = true;
        game.setUpStartBoard.bind(game, test_user._id, board).should.throw(ValidationError);
    });

    it('should give an error if the user (as player 2) already set up the board', async () => {
        game.player1 = 'someone_else';
        game.player2 = test_user;
        game.player1_set_up_pieces = false;
        game.player2_set_up_pieces = true;
        game.setUpStartBoard.bind(game, test_user._id, board).should.throw(ValidationError);
    });
});