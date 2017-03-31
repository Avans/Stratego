const util = require('util');

module.exports = PieceType;

function PieceType(code, name, relative_value, number_per_player) {
    this.code = code;
    this.name = name;
    this.relative_value = relative_value;
    this.number_per_player = number_per_player;

    this.toString = function() {
        return util.format("%s ('%s')", name, code);
    }

    this.canBeat = function(otherPieceType) {
        // Spy can beat Marshal
        if(this == PieceType.TYPES.SPY && otherPieceType == PieceType.TYPES.MARSHAL) {
            return true;
        }

        // Miner can beat bomb
        if(this == PieceType.TYPES.MINER && otherPieceType == PieceType.TYPES.BOMB) {
            return true;
        }

        // Higher pieces can beat lower pieces
        if(this.relative_value >= otherPieceType.relative_value) {
            return true;
        }

        return false;
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
    BOMB: new PieceType('B', 'Bomb', 11, 6),
    MARSHAL: new PieceType('1', 'Marshal', 10, 1),
    GENERAL: new PieceType('2', 'General', 9, 1),
    COLONEL: new PieceType('3', 'Colonel', 8, 2),
    MAJOR: new PieceType('4', 'Major', 7, 3),
    CAPTAIN: new PieceType('5', 'Captain', 6, 4),
    LIEUTENANT: new PieceType('6', 'Lieutenant', 5, 4),
    SERGEANT: new PieceType('7', 'Sergeant', 4, 4),
    MINER: new PieceType('8', 'Miner', 3, 5),
    SCOUT: new PieceType('9', 'Scout', 2, 8),
    SPY: new PieceType('S', 'Spy', 1, 1),
    FLAG: new PieceType('F', 'Flag', 0, 1)
});
