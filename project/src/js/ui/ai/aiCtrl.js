import promotion from '../shared/offlineRound/promotion';
import ground from '../shared/offlineRound/ground';
import makeData from '../shared/offlineRound/data';
import sound from '../../sound';
import replayCtrl from '../shared/offlineRound/replayCtrl';
import storage from '../../storage';
import settings from '../../settings';
import actions from './actions';
import helper from '../helper';
import engine from './engine';
import m from 'mithril';

function forsyth(role) {
  return role === 'knight' ? 'n' : role[0];
}

export default function controller() {

 helper.analyticsTrackView('Offline AI');

  var storageKey = 'ai.current';

  this.vm = {
    aiSearching: false
  };

  var save = function() {
    storage.set(storageKey, {
      data: this.data,
      situations: this.replay.situations,
      ply: this.replay.ply
    });
  }.bind(this);

  var addMove = function(orig, dest, promotionRole) {
    this.replay.addMove(orig, dest, promotionRole);
    const move = orig + dest + (promotionRole ? forsyth(promotionRole) : '');
    engine.addMove(move);
  }.bind(this);

  this.getOpponent = function() {
    var level = settings.ai.opponent();
    return {
      name: settings.ai.availableOpponents.filter(function(o) {
        return o[1] === level;
      })[0][0],
      level: parseInt(level) || 1
    };
  };

  var engineMove = function() {
    if (this.chessground.data.turnColor !== this.data.player.color) {
      this.vm.aiSearching = true;
      m.redraw();
      setTimeout(function() {
        engine.search(function(res) {
          console.log(res);
        });
      }.bind(this), 500);
    }
  }.bind(this);

  var onPromotion = function(orig, dest, role) {
    addMove(orig, dest, role);
  };

  var userMove = function(orig, dest) {
    if (!promotion.start(this, orig, dest, onPromotion)) {
      addMove(orig, dest);
    }
  }.bind(this);

  var onMove = function(orig, dest, capturedPiece) {
    if (!capturedPiece)
      sound.move();
    else
      sound.capture();
  };

  this.onReplayAdded = function() {
    save();
    m.redraw();
    if (this.replay.situation().finished) {
      this.chessground.cancelMove();
      this.chessground.stop();
      setTimeout(function() {
        this.actions.open();
        m.redraw();
      }.bind(this), 1000);
    } else engineMove();
  }.bind(this);

  this.init = function(data, situations, ply) {
    this.data = data;
    if (!this.chessground)
      this.chessground = ground.make(this.data, this.data.game.fen, userMove, onMove);
    else ground.reload(this.chessground, this.data, this.data.game.fen);
    if (!this.replay) this.replay = new replayCtrl(this, situations, ply);
    else this.replay.init(situations, ply);
    this.replay.apply();
    if (this.actions) this.actions.close();
    else this.actions = new actions.controller(this);
    engine.init(this.data.game.fen);
    engineMove();
  }.bind(this);

  this.initAs = function(color) {
    this.init(makeData({
      color: color
    }));
  }.bind(this);

  this.jump = function(ply) {
    if (this.vm.aiSearching) return;
    this.chessground.cancelMove();
    if (this.replay.ply === ply || ply < 0 || ply >= this.replay.situations.length) return;
    this.replay.ply = ply;
    this.replay.apply();
    engine.init(this.replay.situation().fen);
  }.bind(this);

  this.forward = function() {
    this.jump(this.replay.ply + 2);
  }.bind(this);

  this.backward = function() {
    this.jump(this.replay.ply - 2);
  }.bind(this);

  this.firstPly = function () {
    return this.data.player.color === 'black' ? 1 : 0;
  }.bind(this);

  var saved = storage.get(storageKey);
  if (saved) try {
    this.init(saved.data, saved.situations, saved.ply);
  } catch (e) {
    console.log(e, 'Fail to load saved game');
    this.init(makeData({}));
  } else this.init(makeData({}));

  window.plugins.insomnia.keepAwake();

  this.onunload = function() {
    window.plugins.insomnia.allowSleepAgain();
  };
}
