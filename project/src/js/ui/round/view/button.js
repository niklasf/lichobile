import gameApi from '../../../lichess/game';
import gameStatus from '../../../lichess/status';
import helper from '../../helper';
import throttle from 'lodash/function/throttle';
import i18n from '../../../i18n';
import socket from '../../../socket';
import { getPGN } from '../roundXhr';
import { handleXhrError } from '../../../utils';
import m from 'mithril';

export default {
  standard: function(ctrl, condition, icon, hint, socketMsg) {
    return condition(ctrl.data) ? m('button', {
      className: socketMsg,
      'data-icon': icon,
      config: helper.ontouch(function() { socket.send(socketMsg); })
    }, i18n(hint)) : null;
  },
  flipBoard: function(ctrl) {
    return m('button', {
      'data-icon': 'B',
      className: ctrl.vm.flip ? 'flipped' : '',
      config: helper.ontouch(ctrl.flip)
    }, i18n('flipBoard'));
  },
  shareLink: function(ctrl) {
    return m('button', {
      config: helper.ontouch(function() {
        window.plugins.socialsharing.share(null, null, null, gameApi.publicUrl(ctrl.data));
      })
    }, [m('span.fa.fa-link'), i18n('shareGameURL')]);
  },
  sharePGN: function(ctrl) {
    function handler() {
      getPGN(ctrl.data.game.id).then(function(PGN) {
        window.plugins.socialsharing.share(PGN);
      }, err => handleXhrError(err));
    }
    return (
      <button config={helper.ontouch(handler)}>
        <span className="fa fa-share-alt" />
        {i18n('sharePGN')}
      </button>
    );
  },
  submitMove: function(ctrl) {
    return (
      <div>
        <button className="binary_choice" data-icon="E"
          config={helper.ontouch(ctrl.submitMove.bind(undefined, true))}
        >
          Submit move
        </button>
        <button className="binary_choice" data-icon="L"
          config={helper.ontouch(ctrl.submitMove.bind(undefined, false))}
        >
          {i18n('cancel')}
        </button>
      </div>
    );
  },
  forceResign: function(ctrl) {
    return gameApi.forceResignable(ctrl.data) ?
      m('div.force_resign_zone.clearfix', [
        m('div.notice', i18n('theOtherPlayerHasLeftTheGameYouCanForceResignationOrWaitForHim')),
        m('button.binary_choice[data-icon=E]', {
          config: helper.ontouch(function() { socket.send('resign-force'); })
        }, i18n('forceResignation')),
        m('button.binary_choice[data-icon=E]', {
          config: helper.ontouch(function() { socket.send('draw-force'); })
        }, i18n('forceDraw'))
      ]) : null;
  },
  threefoldClaimDraw: function(ctrl) {
    return (ctrl.data.game.threefold) ? m('div.claim_draw_zone', [
      m('div.notice', i18n('threefoldRepetition')),
      m.trust('&nbsp;'),
      m('button[data-icon=E]', {
        config: helper.ontouch(function() { socket.send('draw-claim'); })
      }, i18n('claimADraw'))
    ]) : null;
  },
  cancelDrawOffer: function(ctrl) {
    if (ctrl.data.player.offeringDraw) return m('div.negotiation', [
      m('div.notice', i18n('drawOfferSent')),
      m('button[data-icon=L]', {
        config: helper.ontouch(function() { socket.send('draw-no'); })
      }, i18n('cancel'))
    ]);
  },
  answerOpponentDrawOffer: function(ctrl) {
    if (ctrl.data.opponent.offeringDraw) return m('div.negotiation.clearfix', [
      m('div.notice', i18n('yourOpponentOffersADraw')),
      m('button.binary_choice[data-icon=E]', {
        config: helper.ontouch(function() { socket.send('draw-yes'); })
      }, i18n('accept')),
      m('button.binary_choice[data-icon=L]', {
        config: helper.ontouch(function() { socket.send('draw-no'); })
      }, i18n('decline'))
    ]);
  },
  cancelTakebackProposition: function(ctrl) {
    if (ctrl.data.player.proposingTakeback) return m('div.negotiation', [
      m('div.notice', i18n('takebackPropositionSent')),
      m('button[data-icon=L]', {
        config: helper.ontouch(function() { socket.send('takeback-no'); })
      }, i18n('cancel'))
    ]);
  },
  answerOpponentTakebackProposition: function(ctrl) {
    if (ctrl.data.opponent.proposingTakeback) return m('div.negotiation.clearfix', [
      m('div.notice', i18n('yourOpponentProposesATakeback')),
      m('button.binary_choice[data-icon=E]', {
        config: helper.ontouch(function() { socket.send('takeback-yes'); })
      }, i18n('accept')),
      m('button.binary_choice[data-icon=L]', {
        config: helper.ontouch(function() { socket.send('takeback-no'); })
      }, i18n('decline'))
    ]);
  },
  rematch: function(ctrl) {
    if ((gameStatus.finished(ctrl.data) || gameStatus.aborted(ctrl.data)) &&
      !ctrl.data.tournament && !ctrl.data.opponent.offeringRematch &&
      !ctrl.data.player.offeringRematch) {
      if (ctrl.data.opponent.onGame || ctrl.data.game.perf === 'correspondence') {
        return m('button[data-icon=B]', {
          config: helper.ontouch(function() { socket.send('rematch-yes'); })
        }, i18n('rematch'));
      } else {
        return null;
      }
    }
  },
  answerOpponentRematch: function(ctrl) {
    if (ctrl.data.opponent.offeringRematch) return m('div.negotiation.clearfix', [
      m('div.notice', i18n('yourOpponentWantsToPlayANewGameWithYou')),
      m('button.binary_choice[data-icon=E]', {
        config: helper.ontouch(function() { socket.send('rematch-yes'); })
      }, i18n('joinTheGame')),
      m('button.binary_choice[data-icon=L]', {
        config: helper.ontouch(function() { socket.send('rematch-no'); })
      }, i18n('declineInvitation'))
    ]);
  },
  cancelRematch: function(ctrl) {
    if (ctrl.data.player.offeringRematch) return m('div.negotiation', [
      m('div.notice', i18n('rematchOfferSent')),
      m('div.notice', i18n('waitingForOpponent')),
      m('button[data-icon=L]', {
        config: helper.ontouch(function() { socket.send('rematch-no'); })
      }, i18n('cancelRematchOffer'))
    ]);
  },
  moretime: function(ctrl) {
    if (gameApi.moretimeable(ctrl.data)) return m('button[data-icon=O]', {
      config: helper.ontouch(throttle(function() { socket.send('moretime'); }, 600))
    }, i18n('giveNbSeconds', 15));
  },
  backward: function(ctrl) {
    const prevPly = ctrl.vm.ply - 1;
    const enabled = ctrl.vm.ply !== prevPly && prevPly >= ctrl.firstPly();
    return m('button.game_action[data-icon=I]', {
      config: helper.ontouch(ctrl.jumpPrev, ctrl.jumpFirst),
      className: helper.classSet({
        disabled: ctrl.broken || !enabled
      })
    });
  },
  forward: function(ctrl) {
    const nextPly = ctrl.vm.ply + 1;
    const enabled = ctrl.vm.ply !== nextPly && nextPly <= ctrl.lastPly();
    return m('button.game_action[data-icon=H]', {
      config: helper.ontouch(ctrl.jumpNext, ctrl.jumpLast),
      className: helper.classSet({
        disabled: ctrl.broken || !enabled
      })
    });
  }
};
