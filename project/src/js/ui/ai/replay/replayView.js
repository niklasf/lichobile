var utils = require('../../../utils');

function renderBackwardButton(ctrl) {
  return m('button.game_action[data-icon=I]', {
    config: utils.ontouchend(ctrl.backward),
    class: ctrl.canBackward() ? '' : 'disabled'
  });
}

function renderForwardButton(ctrl, nbMoves) {
  return m('button.game_action[data-icon=H]', {
    config: utils.ontouchend(ctrl.forward),
    class: ctrl.canForward() ? '' : 'disabled'
  });
}

module.exports.renderButtons = function(ctrl) {
  return [
    renderBackwardButton(ctrl),
    renderForwardButton(ctrl)
  ];
};
