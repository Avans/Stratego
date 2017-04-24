var should = require('should');
var expect = require('chai').expect;
var server = require('../../app');
var request = require('supertest')(server);

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Game = mongoose.model('Game');


const API_KEY = 'TEST_API_KEY';
var test_user;

/**
 * Returns a request with the correct url and expectations
 */
var api_request = function() {
    function apify_request(request) {
        return request; // TODO: add expects
    }
    function apify_url(url) {
        return url + '?api_key=' + API_KEY;
    }

    return {
        get: function(url) {
            return apify_request(request.get(apify_url(url)));
        },
        post: function(url) {
            return apify_request(request.post(apify_url(url)).type('json'));
        },
        delete: function(url) {
            return apify_request(request.del(apify_url(url)));
        }
    };
}();

/**
 * Ensure that the environment is the same by resetting the database for each test
 */
beforeEach(async function() {
    await User.remove();
    await Game.remove();

    test_user = new User();
    test_user._id = 'test_id';
    test_user.name = 'Test User';
    test_user.api_key = API_KEY;
    await test_user.save();
});

/**
 * Test API key checks
 */
describe('api_key checks', function() {
    const SOME_API = '/api/games';

    it('should give an error when the api_key is missing', async function() {
        const res = await request.get(SOME_API).expect(403);

        res.body.should.eql({
            message: 'Geef via de URL je api_key mee'
        });
    });

    it('should give an error when the api_key is not corresponding to any user', async function() {
        const res = await request.get(SOME_API + '?api_key=nonexistingapikey').expect(403);

        res.body.should.eql({
            message: 'De API key "nonexistingapikey" is niet bekend'
        });
    });
});

/**
 * GET /api/games
 */
describe('GET /api/games', function() {

    it('should return no games with empty database', async function() {
        const res = await api_request.get('/api/games').expect(200);

        res.body.should.eql([]);
    });

    it('should return a game with the user as player 1', async function() {
        let game = new Game();
        game.player1 = test_user._id;
        game = await game.save();

        const res = await api_request.get('/api/games').expect(200);

        res.body.should.eql([game.outputForUser(test_user._id)]);
    });

    it('should return a game with the user as player 2', async function() {
        let game = new Game();
        game.player1 = 'some_player';
        game.player2 = test_user._id;
        game = await game.save();

        const res = await api_request.get('/api/games').expect(200);

        res.body.should.eql([game.outputForUser(test_user._id)]);
    });

    it('shouldn\'t return games the user is not participating in', async function() {
        let game = new Game();
        game.player1 = 'some_player';
        game.player2 = 'some_other_player';
        game = await game.save();

        const res = await api_request.get('/api/games').expect(200);

        res.body.should.eql([]);
    });
});

/**
 * POST /api/games
 */
describe('POST /api/games', function() {
    it('should validate the input', async function() {
        // Temporarily silence the error that this gives
        /* eslint-disable no-console */
        const error = console.error;
        console.error = () => {};

        await api_request
                .post('/api/games')
                .send('{}')
                .expect(400);

        console.error = error;
        /* eslint-enable no-console */
    });

    it('should create a new game', async function() {
        const res = await api_request
                            .post('/api/games')
                            .send('{"ai": false}')
                            .expect(201);

        const game = await Game.findById(res.body.id);

        // Test for correct output
        res.body.should.eql(game.outputForUser(test_user._id));

        // Test if the game is in a correct state
        game.player1.should.eql(test_user._id);
        should.not.exist(game.player2);
        game.state.should.eql(Game.STATE.WAITING_FOR_AN_OPPONENT);
    });

    it('should create a new AI game', async function() {
        const res = await api_request
                            .post('/api/games')
                            .send('{"ai": true}')
                            .expect(201);

        expect(res.body.opponent).to.eql('ai');

        const game = await Game.findById(res.body.id);

        game.player1.should.eql(test_user._id);
        game.player2.should.eql('ai');
        game.player2_set_up_pieces.should.be.true();
        game.state.should.eql(Game.STATE.WAITING_FOR_PIECES);
    });

    it('should join an existing game', async function() {

        // Some other player is waiting in a game
        let game = new Game();
        game.player1 = 'some_waiting_player';
        game.state = 'waiting_for_an_opponent';
        await game.save();

        // Join that game
        const res = await api_request
                            .post('/api/games')
                            .send('{"ai": false}')
                            .expect(201);

        game = await Game.findById(res.body.id);

        game.player2.should.eql(test_user._id);
        game.state.should.eql(Game.STATE.WAITING_FOR_PIECES);
    });

    it('should not create a new game if the user already has a waiting game', async function() {
        let game = new Game();
        game.player1 = test_user._id;
        game.state = Game.STATE.WAITING_FOR_AN_OPPONENT;
        await game.save();

        // Try creating a game
        await api_request
                    .post('/api/games')
                    .send('{"ai": false}')
                    .expect(400);

        expect(await Game.count()).to.eql(1);
    });
});

/**
 * DELETE /api/games
 */
describe('DELETE /api/games', function() {
    it('should delete all games with player', async function() {
        // Create two games with the test user
        const game1 = new Game();
        game1.player1 = test_user._id;
        await game1.save();

        const game2 = new Game();
        game2.player2 = test_user._id;
        await game1.save();

        // Delete
        await api_request
                    .delete('/api/games')
                    .expect(204);

        // Check that they are deleted
        const games = await Game.find();
        games.should.eql([]);
    });

    it('should not delete games without player', async function() {
        // Create two games with the test user
        let game = new Game();
        game.player1 = 'some_player';
        await game.save();

        await api_request
                    .delete('/api/games')
                    .expect(204);

        game = await Game.findById(game._id);
        should.exist(game);
    });
});

/**
 * GET /api/games/{id}
 */
describe('GET /api/games/:id', function() {
    it('should return a game', async function() {
        let game = new Game();
        game.player1 = test_user._id;
        game = await game.save();

        const res = await api_request
                            .get('/api/games/' + game._id)
                            .expect(200);

        res.body.should.eql(game.outputForUser(test_user._id));
    });

    it('should send a 404 if the game doesn\'t exist', async function() {
        await api_request
                    .get('/api/games/D2Vr5')
                    .expect(404);
    });

    it('should send a 404 if the user has not joined the game', async function() {
        let game = new Game();
        game.player1 = 'some_player';
        game.player2 = 'some_other_player';
        game = await game.save();

        await api_request
                    .get('/api/games/' + game._id)
                    .expect(404);
    });
});


/**
 * DELETE /api/games/{id}
 */
describe('DELETE /api/games/:id', function() {
    it('should delete a game', async function() {
        let game = new Game();
        game.player1 = test_user._id;
        game = await game.save();

        await api_request
                    .delete('/api/games/' + game._id)
                    .expect(204);

        should.not.exist(await Game.findById(game._id));
    });

    it('should send a 404 if the game doesn\'t exist', async function() {
        await api_request
                    .delete('/api/games/Dfk4S')
                    .expect(404);
    });
});

describe('GET /api/games/:id/actions', function() {
    let game;

    beforeEach(async function() {
        game = new Game();
        game.player1 = test_user._id;
        game.actions = [{
            type: 'move_piece',
            square: {row: 0, column: 0},
            square_to: {row: 1, column: 0}
        },
        {
            type: 'reveal_piece',
            square: {row: 0, column: 0},
            piece: 'B'
        }];
        game = await game.save();
    });

    it('should give the list of actions for a game', async function() {
        const res = await api_request
            .get('/api/games/' + game._id + '/actions')
            .expect(200);

        expect(res.body).to.deep.equal([{
            type: 'move_piece',
            square: {row: 0, column: 0},
            square_to: {row: 1, column: 0}
        },
        {
            type: 'reveal_piece',
            square: {row: 0, column: 0},
            piece: 'B'
        }]);
    });

    it('should give a rotated perspective for player 2', async function() {
        game.player1 = 'someone_else';
        game.player2 = test_user._id;
        game = await game.save();

        const res = await api_request
            .get('/api/games/' + game._id + '/actions')
            .expect(200);

        expect(res.body).to.deep.equal([{
            type: 'move_piece',
            square: {row: 9, column: 9},
            square_to: {row: 8, column: 9}
        },
        {
            type: 'reveal_piece',
            square: {row: 9, column: 9},
            piece: 'B'
        }]);
    });
});

describe('POST /api/games/:id/start_board', function() {
    const board = [['7', 'B', '5', '2', '9', '9', '1', '8', '9', 'B'],
                   ['B', '7', '9', 'S', '4', '5', '8', '5', '3', '9'],
                   ['7', 'B', '4', '8', '6', '4', '3', '8', '7', '6'],
                   ['B', 'F', 'B', '5', '9', '6', '6', '9', '9', '8']];

    it('should still be waiting for pieces after the first board', async function() {
        let game = new Game();
        game.player1 = test_user;
        game.player2 = 'someone_else';
        game.state = Game.STATE.WAITING_FOR_PIECES;
        game = await game.save();

        const res = await api_request
            .post('/api/games/' + game._id + '/start_board')
            .send(board)
            .expect(200);

        // Check that the game is still waiting for (player 2) pieces
        game = await Game.findById(game._id);
        game.state.should.be.equal(Game.STATE.WAITING_FOR_PIECES);

        // Should give the new game as output
        res.body.should.eql(game.outputForUser(test_user._id));
    });

    it('should start playing if the other player has already set up his board', async function() {
        let game = new Game();
        game.player1 = test_user;
        game.player2 = 'someone_else';
        game.player2_set_up_pieces = true;
        game.state = Game.STATE.WAITING_FOR_PIECES;
        game = await game.save();

        await api_request
            .post('/api/games/' + game._id + '/start_board')
            .send(board)
            .expect(200);

        // Game should now have started
        game = await Game.findById(game._id);
        game.state.should.be.equal(Game.STATE.STARTED);
        JSON.stringify(game.start_board).should.equal(JSON.stringify(game.board));
    });
});

describe('POST /api/games/:id/actions', function() {
    let game;

    beforeEach(async function() {
        game = new Game();
        game.player1 = test_user._id;
        game.player2 = 'someone_else';
        game.board = [['1:4', ' ',   '2:6', ' ',   ' ',   ' ',   ' ',   ' ',   ' ',   ' '],
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
        game.player1s_turn = true;
        await game.save();
    });

    it('should perform and save a move on the board', async function() {
        const res = await api_request
            .post('/api/games/' + game._id + '/actions')
            .send({
                square: {row: 0, column: 0},
                square_to: {row: 1, column: 0},
            })
            .expect(200);

        // Expect the executed actions to be returned
        expect(res.body.actions).to.deep.equal([
            {
                type: 'move_piece',
                square: {column: 0, row: 0},
                square_to: {column: 0, row: 1}
            }
        ]);
        game = await Game.findById(game._id);
        expect(res.body.game).to.deep.equal(game.outputForUser(test_user._id));

        // Expect move to be saved
        game = await Game.findById(game._id);
        game.player1s_turn.should.be.false();
        game.board[0][0].should.equal(' ');
    });

    it('should have rotated coordinates for player 2', async function() {
        // Make the user player2
        game.player1 = 'someone_else';
        game.player2 = test_user._id;
        game.player1s_turn = false;
        game = await game.save();

        const res = await api_request
            .post('/api/games/' + game._id + '/actions')
            .send({
                square: {row: 9, column: 7},
                square_to: {row: 8, column: 7},
            })
            .expect(200);

        // Expect the actions to be from player2's perspective
        expect(res.body.actions).to.deep.equal([
            {
                type: 'move_piece',
                square: {row: 9, column: 7},
                square_to: {row: 8, column: 7}
            }
        ]);
    });

    it('should immediately do the AI\'s turn', async function() {
        game.player2 = 'ai';
        await game.save();

        const res = await api_request
            .post('/api/games/' + game._id + '/actions')
            .send({
                square: {row: 0, column: 0},
                square_to: {row: 1, column: 0},
            })
            .expect(200);
        res.body.actions.length.should.equal(2);

        // Player 1 should have the turn again immediately
        game = await Game.findById(game._id);
        game.player1s_turn.should.be.true();
    });

    it('should not crash if the ai has no legal moves', async function() {
        game.player2 = 'ai';
        game.board[0][2] = '2:F';
        game.markModified('board');
        await game.save();

        await api_request
            .post('/api/games/' + game._id + '/actions')
            .send({
                square: {row: 0, column: 0},
                square_to: {row: 1, column: 0},
            })
            .expect(200);

        game = await Game.findById(game._id);
        game.player1s_turn.should.be.true();
    });

    it('should not let the ai do a move after the player catches the flag', async function() {
        game.player2 = 'ai';
        game.board[1][0] = '2:F';
        game.markModified('board');
        await game.save();

        await api_request
            .post('/api/games/' + game._id + '/actions')
            .send({
                square: {row: 0, column: 0},
                square_to: {row: 1, column: 0},
            })
            .expect(200);

        game = await Game.findById(game._id);
        game.board[0][2].should.equal('2:6');
    });
});
