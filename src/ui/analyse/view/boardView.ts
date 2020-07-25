import h from 'mithril/hyperscript'
import * as chessFormat from '../../../utils/chessFormat'
import { parseUci, makeSquare } from 'chessops/util'
import { isDrop } from 'chessops/types'
import gameStatusApi from '../../../lichess/status'
import { findTag, gameResult } from '../../../lichess/interfaces/study'
import Board from '../../shared/Board'
import { Shape } from '../../shared/BoardBrush'

import Clock from './Clock'
import { povDiff } from '../ceval/winningChances'
import AnalyseCtrl from '../AnalyseCtrl'

export default function renderBoard(ctrl: AnalyseCtrl) {
  return h('div.analyse-boardWrapper', [
    playerBar(ctrl, ctrl.topColor()),
    h(Board, {
      variant: ctrl.data.game.variant.key,
      chessground: ctrl.chessground,
      shapes: computeShapes(ctrl),
      clearableShapes: ctrl.node.shapes,
      wrapperClasses: ctrl.settings.s.smallBoard ? 'halfsize' : '',
      canClearShapes: true,
    }),
    playerBar(ctrl, ctrl.bottomColor()),
  ])
}

export function playerBar(ctrl: AnalyseCtrl, color: Color) {
  const pName = ctrl.playerName(color)
  if (pName === 'Anonymous') return null

  const study = ctrl.study && ctrl.study.data
  let title, elo, result: string | undefined
  if (study) {
    title = findTag(study, `${color}title`)
    elo = findTag(study, `${color}elo`)
    result = gameResult(study, color === 'white')
  } else if (gameStatusApi.finished(ctrl.data)) {
    const winner = ctrl.data.game.winner
    result = winner === undefined ? '½' : winner === color ? '1' : '0'
  }
  const checkCount = ctrl.node.checkCount
  const showRight = ctrl.node.clock || checkCount
  return h('div.analyse-player_bar', {
    className: ctrl.settings.s.smallBoard ? 'halfsize' : ''
  }, [
    h('div.info', [
      result ? h('span.result', result) : null,
      h('span.name', (title ? title + ' ' : '') + pName + (elo ? ` (${elo})` : '')),
    ]),
    showRight ? h('div.player_bar_clock', [
      h(Clock, { ctrl, color }),
      checkCount ? renderCheckCount(ctrl.bottomColor() === 'white', checkCount) : null
    ]) : null,
  ])
}

function computeShapes(ctrl: AnalyseCtrl): readonly Shape[] {
  const player = ctrl.data.game.player
  const ceval = ctrl.node && ctrl.node.ceval
  const rEval = ctrl.node && ctrl.node.eval
  let nextBest: string | undefined
  let curBestShapes: readonly Shape[] = []

  if (ctrl.practice) {
    const hint = ctrl.practice.hinting()
    if (hint) {
      if (hint.mode === 'move') curBestShapes = moveOrDropShape(hint.uci, 'paleBlue', player)
        else curBestShapes = [{
          orig: chessFormat.uciToMoveOrDrop(hint.uci)[0],
          brush: 'paleBlue'
        }]
    }
  }

  if (!ctrl.retro && !ctrl.practice && ctrl.settings.s.showBestMove) {
    nextBest = ctrl.nextNodeBest() || (ceval && ceval.best)
    if (nextBest) {
      curBestShapes = moveOrDropShape(nextBest, 'paleBlue', player)
    }
    if (ceval && ceval.pvs.length > 1) {
      ceval.pvs.slice(1).forEach(pv => {
        const shift = povDiff(player, ceval.pvs[0], pv)
        if (shift >= 0 && shift < 0.2) {
          const linewidth = Math.round(12 - shift * 50) // 12 to 2
          curBestShapes = curBestShapes.concat(moveOrDropShape(pv.moves[0], 'paleBlue' + linewidth, player))
        }
      })
    }
  }
  const pastBestShape: Shape[] = !ctrl.retro && rEval && rEval.best ?
  moveOrDropShape(rEval.best, 'paleGreen', player) : []

  const badNode = ctrl.retro && ctrl.retro.showBadNode()
  const badMoveShape: Shape[] = badNode && badNode.uci ?
  moveOrDropShape(badNode.uci, 'paleRed', player) : []

  return [
    ...pastBestShape, ...curBestShapes, ...badMoveShape
  ]
}

function renderCheckCount(whitePov: boolean, checkCount: { white: number, black: number }) {
  const w = h('span.color-icon.white', '+' + checkCount.black)
  const b = h('span.color-icon.black', '+' + checkCount.white)
  return h('div.analyse-checkCount', whitePov ? [w, b] : [b, w])
}

function moveOrDropShape(uci: Uci, brush: string, player: Color): Shape[] {
  const move = parseUci(uci)!;
  if (isDrop(move)) {
    const pos = makeSquare(move.to)
    return [
      {
        brush,
        orig: pos
      },
      {
        orig: pos,
        piece: {
          role: move.role,
          color: player
        },
        brush
      }
    ]
  } else {
    const shapes: Shape[] = [{
      brush,
      orig: makeSquare(move.from),
      dest: makeSquare(move.to)
    }]
    if (move.promotion) shapes.push({
      brush,
      orig: makeSquare(move.to),
      piece: {
        role: move.promotion,
        color: player
      }
    })
    return shapes
  }
}
