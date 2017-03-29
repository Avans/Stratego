const util = require('util');

module.exports = PieceType;

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
