var should = require('should');
var expect = require('chai').expect;
var app = require('../../app');
var ValidationError = require('../../helpers/ValidationError');

var mongoose = require('mongoose');
var Game = mongoose.model('Game');


/**
 * Test API key checks
 */
describe('Game.outputForUser()', function() {
    it('should work', async function() {
        // TODO
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