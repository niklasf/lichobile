import garbo from '../../garbochess/garbochess';

// [time, plies]
var levels = {
  1: [20, 1],
  2: [40, 2],
  3: [70, 3],
  4: [120, 4],
  5: [300, 6],
  6: [600, 8],
  7: [1000, 12],
  8: [2000, 20]
};

var level = 1;

var forsyth = function(role) {
  return role === 'knight' ? 'n' : role[0];
};

module.exports = function(self) {
  self.onmessage = function (e) {
    if (e.data.action === 'init') {
      garbo.reset();
      garbo.setFen(e.data.fen);
    }

    if (e.data.action === 'setLevel') {
      level = e.data.level;
      garbo.setMoveTime(levels[level][0]);
    }

    if (e.data.action === 'addMove') {
      let { origKey, destKey, promotionRole } = e.data;
      let move = origKey + destKey + (promotionRole ? forsyth(promotionRole) : '');
      garbo.addMove(garbo.getMoveFromString(move));
      self.postMessage({ fen: garbo.getFen() });
    }

    if (e.data.action === 'search') {
      garbo.search(function(bestMove) {
        if (bestMove === 0) return;
        let str = garbo.formatMove(bestMove);
        let move = [str.slice(0, 2), str.slice(2, 4), str[4]];
        self.postMessage({ move });
      }, levels[level][1], null);
    }

  };
};
