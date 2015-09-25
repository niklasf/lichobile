
export function init() {
  window.Stockfish.init(function(res) {
    console.log('initialized', res);
  });
}

export function initPos(fen) {
  window.Stockfish.cmd('position ' + fen);
}

export function addMove(move) {
  window.Stockfish.cmd('position moves ' + move);
}

export function search(cb) {
  window.Stockfish.cmd('go depth 15', function(res) {
    console.log('search result', res);
    cb(res);
  });
}
