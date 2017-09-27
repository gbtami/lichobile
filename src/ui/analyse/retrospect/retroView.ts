import * as h from 'mithril/hyperscript'
import i18n from '../../../i18n'
import { oppositeColor } from '../../../utils'
import spinner from '../../../spinner'
import { Tree } from '../../shared/tree'
import * as helper from '../../helper'
import { renderIndexAndMove } from '../view/moveView'
import { Feedback, IRetroCtrl } from './RetroCtrl'
import AnalyseCtrl from '../AnalyseCtrl'

export default function retroView(root: AnalyseCtrl): Mithril.BaseNode | undefined {
  const ctrl = root.retro
  if (!ctrl) return
  const fb = ctrl.vm.feedback
  return h('div.retro_box', [
    renderTitle(ctrl),
    h('div.feedback.' + fb, renderFeedback(root, fb))
  ])
}

function skipOrViewSolution(ctrl: IRetroCtrl) {
  return h('div.choices', [
    h('button', {
      oncreate: helper.ontap(ctrl.viewSolution)
    }, i18n('viewTheSolution')),
    h('button', {
      oncreate: helper.ontap(ctrl.skip)
    }, 'Skip this move')
  ])
}

function jumpToNext(ctrl: IRetroCtrl) {
  return h('a.half.continue', {
    oncreate: helper.ontap(ctrl.jumpToNext)
  }, [
    h('i[data-icon=G]'),
    'Next'
  ])
}

const minDepth = 8
const maxDepth = 18

function renderEvalProgress(node: Tree.Node): Mithril.BaseNode {
  return h('div.progress', h('div', {
    attrs: {
      style: `width: ${node.ceval ? (100 * Math.max(0, node.ceval.depth - minDepth) / (maxDepth - minDepth)) + '%' : 0}`
    }
  }))
}

const feedback = {
  find(ctrl: IRetroCtrl): Mithril.BaseNode[] {
    return [
      h('div.player', [
        h('div.no-square', h('piece.king.' + ctrl.color)),
        h('div.instruction', [
          h('strong', [
            ...renderIndexAndMove({
              withDots: true,
              showGlyphs: true,
              showEval: false
            }, ctrl.vm.current.fault.node),
            ' was played'
          ]),
          h('em', 'Find a better move for ' + ctrl.color),
          skipOrViewSolution(ctrl)
        ])
      ])
    ]
  },
  // user has browsed away from the move to solve
  offTrack(ctrl: IRetroCtrl): Mithril.BaseNode[] {
    return [
      h('div.player', [
        h('div.icon.off', '!'),
        h('div.instruction', [
          h('strong', 'You browsed away'),
          h('div.choices.off', [
            h('button', {
              oncreate: helper.ontap(ctrl.jumpToNext)
            }, 'Resume learning')
          ])
        ])
      ])
    ]
  },
  fail(ctrl: IRetroCtrl): Mithril.BaseNode[] {
    return [
      h('div.player', [
        h('div.icon', '✗'),
        h('div.instruction', [
          h('strong', 'You can do better'),
          h('em', 'Try another move for ' + ctrl.color),
          skipOrViewSolution(ctrl)
        ])
      ])
    ]
  },
  win(ctrl: IRetroCtrl): Mithril.BaseNode[] {
    return [
      h('div.half.top',
        h('div.player', [
          h('div.icon', '✓'),
          h('div.instruction', h('strong', i18n('goodMove')))
        ])
      ),
      jumpToNext(ctrl)
    ]
  },
  view(ctrl: IRetroCtrl): Mithril.BaseNode[] {
    return [
      h('div.half.top',
        h('div.player', [
          h('div.icon', '✓'),
          h('div.instruction', [
            h('strong', 'Solution:'),
            h('em', [
              'Best move was ',
              h('strong', renderIndexAndMove({
                withDots: true,
                showEval: false
              }, ctrl.vm.current.solution.node)
              )
            ])
          ])
        ])
      ),
      jumpToNext(ctrl)
    ]
  },
  eval(ctrl: IRetroCtrl): Mithril.BaseNode[] {
    return [
      h('div.half.top',
        h('div.player.center', [
          h('div.instruction', [
            h('strong', 'Evaluating your move'),
            renderEvalProgress(ctrl.node())
          ])
        ])
      )
    ]
  },
  end(ctrl: IRetroCtrl, flip: () => void, hasFullComputerAnalysis: () => boolean): Mithril.BaseNode[] {
    if (!hasFullComputerAnalysis()) return [
      h('div.half.top',
        h('div.player', [
          h('div.icon', spinner.getVdom()),
          h('div.instruction', 'Waiting for analysis...')
        ])
      )
    ]
    const nothing = !ctrl.completion()[1]
    return [
      h('div.player', [
        h('div.no-square', h('piece.king.' + ctrl.color)),
        h('div.instruction', [
          h('em', nothing ?
            'No mistakes found for ' + ctrl.color :
            'Done reviewing ' + ctrl.color + ' mistakes'),
          h('div.choices.end', [
            nothing ? null : h('button', {
              oncreate: helper.ontap(ctrl.reset)
            }, 'Do it again'),
            h('button', {
              oncreate: helper.ontap(flip)
            }, 'Review ' + oppositeColor(ctrl.color) + ' mistakes')
          ])
        ])
      ])
    ]
  },
}

function renderFeedback(root: AnalyseCtrl, fb: Feedback) {
  const ctrl: IRetroCtrl = root.retro!
  const current = ctrl.vm.current
  if (ctrl.isSolving() && current && root.path !== current.prev.path)
  return feedback.offTrack(ctrl)
  if (fb === 'find') return current ? feedback.find(ctrl) :
    feedback.end(ctrl, root.settings.flip, root.hasFullComputerAnalysis)
  return feedback[fb](ctrl)
}

function renderTitle(ctrl: IRetroCtrl): Mithril.BaseNode {
  const completion = ctrl.completion()
  return h('div.title', [
    h('span', 'Learn from your mistakes'),
    h('span', Math.min(completion[0] + 1, completion[1]) + ' / ' + completion[1]),
    h('span.close[data-icon=L]', {
      oncreate: helper.ontap(ctrl.close)
    })
  ])
}
