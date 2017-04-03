var should = require('should');
var expect = require('chai').expect;
var server = require('../../app');
var request = require('supertest')(server);

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Game = mongoose.model('Game');


const API_KEY = 'TEST_API_KEY';
const TEST_GAME_ID = 'test_game_id';
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
    }
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
    })
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
        game = await game.save()

        const res = await api_request.get('/api/games').expect(200);

        res.body.should.eql([game.outputForUser(test_user)]);
    });

    it('should return a game with the user as player 2', async function() {
        let game = new Game();
        game.player1 = 'some_player';
        game.player2 = test_user._id;
        game = await game.save()

        const res = await api_request.get('/api/games').expect(200);

        res.body.should.eql([game.outputForUser(test_user)]);
    });

    it('shouldn\'t return games the user is not participating in', async function() {
        let game = new Game();
        game.player1 = 'some_player';
        game.player2 = 'some_other_player'
        game = await game.save()

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
        const error = console.error;
        console.error = () => {}

        await api_request
                .post('/api/games')
                .send('{}')
                .expect(400);

        console.error = error;
    });

    it('should create a new game', async function() {
        const res = await api_request
                            .post('/api/games')
                            .send('{"ai": false}')
                            .expect(201);

        const game = await Game.findById(res.body.id);

        // Test for correct output
        res.body.should.eql(game.outputForUser(test_user));

        // Test if the game is in a correct state
        game.player1.should.eql(test_user._id);
        should.not.exist(game.player2);
        game.state.should.eql('waiting_for_an_opponent');
    });

    it('should create a new AI game', async function() {
        const res = await api_request
                            .post('/api/games')
                            .send('{"ai": true}')
                            .expect(201);

        const game = await Game.findById(res.body.id);

        game.player1.should.eql(test_user._id);
        game.player2.should.eql('ai');
        game.player2_set_up_pieces.should.be.true();
        game.state.should.eql('waiting_for_pieces');
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
        game.state.should.eql('waiting_for_pieces');
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
        const res = await api_request
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

        const res = await api_request
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

        res.body.should.eql(game.outputForUser(test_user));
    });

    it('should send a 404 if the game doesn\'t exist', async function() {
        const res = await api_request
                            .get('/api/games/D2Vr5')
                            .expect(404);
    });

    it('should send a 404 if the user has not joined the game', async function() {
        let game = new Game();
        game.player1 = 'some_player';
        game.player2 = 'some_other_player';
        game = await game.save();

        const res = await api_request
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

        const res = await api_request
                            .delete('/api/games/' + game._id)
                            .expect(204);

        should.not.exist(await Game.findById(game._id));
    });

    it('should send a 404 if the game doesn\'t exist', async function() {
        const res = await api_request
                            .delete('/api/games/Dfk4S')
                            .expect(404);
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
        res.body.should.eql(game.outputForUser(test_user));
    });

    it('should start playing if the other player has already set up his board', async function() {
        let game = new Game();
        game.player1 = test_user;
        game.player2 = 'someone_else';
        game.player2_set_up_pieces = true;
        game.state = Game.STATE.WAITING_FOR_PIECES;
        game = await game.save();

        const res = await api_request
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
        expect(res.body.game).to.deep.equal(game.outputForUser(test_user));

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
                square: {row: 0, column: 2},
                square_to: {row: 1, column: 2},
            })
            .expect(200);

        // Expect the actions to be from player2's perspective
        expect(res.body.actions).to.deep.equal([
            {
                type: 'move_piece',
                square: {column: 7, row: 9},
                square_to: {column: 7, row: 8}
            }
        ]);
    });

    // Should do AI move
});
