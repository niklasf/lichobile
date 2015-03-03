var Chess = require('chessli.js').Chess;
var game = require('../../round/game');
var engine = require('../engine');

module.exports = function(root, situations, ply) {

  this.root = root;

  this.init = function(situations, ply) {
    if (situations) this.situations = situations;
    else {
      var chess = new Chess(this.root.data.game.initialFen, 0);
      this.situations = [{
        fen: this.root.data.game.initialFen,
        turnColor: this.root.data.game.player,
        movable: {
          color: this.root.data.player.color,
          dests: chess.dests()
        },
        check: false,
        lastMove: null
      }];
    }
    this.ply = ply || 0;
  }.bind(this);
  this.init(situations, ply);

  this.situation = function() {
    return this.situations[this.ply];
  }.bind(this);

  this.apply = function() {
    this.root.chessground.set(this.situation());
  }.bind(this);

  this.jump = function(ply) {
    this.root.chessground.cancelMove();
    if (this.ply === ply || ply < 0 || ply >= this.situations.length) return;
    this.ply = ply;
    this.apply();
    engine.init(this.situation().fen);
  }.bind(this);

  var isWhite = function() {
    return this.root.data.player.color === 'white';
  }.bind(this);

  var isMyTurn = function() {
    return this.ply % 2 === (isWhite() ? 0 : 1);
  }.bind(this);

  var jumpDelay = function() {
    return this.root.chessground.data.animation.duration + 20;
  }.bind(this);

  this.canBackward = function() {
    return this.ply > (isWhite() ? 0 : 1);
  }.bind(this);

  this.canForward = function() {
    return this.ply < (this.situations.length - (isWhite() ? 1 : 2));
  }.bind(this);

  var jumpTimeout;

  this.backward = function() {
    if (jumpTimeout) clearTimeout(jumpTimeout);
    if (!canBackward()) return;
    this.jump(this.ply - 1);
    // if (isMyTurn()) return;
    jumpTimeout = setTimeout(function() {
      if (!canBackward()) return;
      this.jump(this.ply - 1);
    }.bind(this), jumpDelay());
  }.bind(this);

  this.forward = function() {
    if (jumpTimeout) clearTimeout(jumpTimeout);
    if (this.ply > this.situations.length - 1) return;
    this.jump(this.ply + 1);
    if (isMyTurn()) return;
    jumpTimeout = setTimeout(function() {
      if (this.ply > this.situations.length - 1) return;
      this.jump(this.ply + 1);
    }.bind(this), jumpDelay());
  }.bind(this);

  var forsyth = function(role) {
    return role === 'knight' ? 'n' : role[0];
  };

  this.addMove = function(orig, dest, promotion) {
    var situation = this.situation();
    var chess = new Chess(situation.fen, 0);
    var promotionLetter = (dest[1] == 1 || dest[1] == 8) ? (promotion ? forsyth(promotion) : 'q') : null;
    var move = chess.move({
      from: orig,
      to: dest,
      promotion: promotionLetter
    });
    this.ply++;
    var turnColor = chess.turn() === 'w' ? 'white' : 'black';
    if (this.ply <= this.situations.length)
      this.situations = this.situations.slice(0, this.ply);
    this.situations.push({
      fen: chess.fen(),
      turnColor: turnColor,
      movable: {
        dests: chess.dests()
      },
      check: chess.in_check(),
      checkmate: chess.in_checkmate(),
      lastMove: [move.from, move.to],
      promotion: promotionLetter
    });
    this.apply();
  };

  this.pgn = function() {
    var chess = new Chess(this.root.data.game.initialFen, 0);
    this.situations.forEach(function(sit) {
      if (sit.lastMove) chess.move({
        from: sit.lastMove[0],
        to: sit.lastMove[1],
        promotion: sit.promotion
      });
    });
    chess.header('Event', 'Casual game');
    chess.header('Site', 'http://lichess.org');
    chess.header('Date', moment().format('YYYY.MM.DD'));
    // chess.header('Result', game.result(this.root.data));
    chess.header('Variant', 'Standard');
    return chess.pgn({
      max_width: 30,
      newline_char: '<br />'
    });
  }.bind(this);
};
