const should = require('should');

const PieceType = require('../../models/PieceType');


/**
 * Test the order in which pieces can beat eachother
 */
describe('PieceType.canBeat()', function() {
    it("Colonel should beat Sergeant", async function() {
        PieceType.TYPES.COLONEL.canBeat(PieceType.TYPES.SERGEANT).should.be.true();
    });

    it("Marshal should not beat Bomb", async function() {
        PieceType.TYPES.MARSHAL.canBeat(PieceType.TYPES.BOMB).should.be.false();
    });

    it("Marshal should beat Spy", async function() {
        PieceType.TYPES.MARSHAL.canBeat(PieceType.TYPES.SPY).should.be.true();
    });

    it("Spy should beat Marshal", async function() {
        PieceType.TYPES.SPY.canBeat(PieceType.TYPES.MARSHAL).should.be.true();
    });

    it("Miner should beat Bomb", async function() {
        PieceType.TYPES.MINER.canBeat(PieceType.TYPES.BOMB).should.be.true();
    });

    it("Bomb should not beat Miner", async function() {
        PieceType.TYPES.BOMB.canBeat(PieceType.TYPES.MINER).should.be.false();
    });

    it("Scout should beat Scout", async function() {
        // Equal values can beat the other
        // with the provision that they are themselves also destroyed (that logic is somewhere else)
        PieceType.TYPES.SCOUT.canBeat(PieceType.TYPES.SCOUT).should.be.true();
    });

    it("Spy should beat Flag", async function() {
        PieceType.TYPES.SPY.canBeat(PieceType.TYPES.FLAG).should.be.true();
    });
});
