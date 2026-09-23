import type { Game } from '../engine/game'
import type { ObjectiveCard } from '../engine/objectives'
import type { ScoreLine } from '../engine/scoreCalculator'
import type { DieColor } from '../engine/types'

const JEWEL: Record<DieColor, string> = {
  red: 'var(--ruby)',
  yellow: 'var(--amber)',
  blue: 'var(--cobalt)',
  green: 'var(--emerald)',
  purple: 'var(--amethyst)',
}
const JEWELS = Object.values(JEWEL)
const GOLDS = ['#fff4cc', '#ffd766', '#ffb21c', '#e58a1f']

/** Short names that fit a phone chip; the sheet shows the full card. */
function shortName(card: ObjectiveCard): string {
  if (card.kind === 'private') return `${card.color[0]!.toUpperCase()}${card.color.slice(1)} sum`
  const s = card.strategy
  switch (s.kind) {
    case 'valueParity':
      return s.parity === 'odd' ? 'Odd dice' : 'Even dice'
    case 'lineDiversity':
      return `${s.axis === 'row' ? 'Row' : 'Col'} ${s.trait === 'color' ? 'colors' : 'values'}`
    case 'diagonalDiversity':
      return 'Diagonals'
    case 'colorQuorum':
      return 'Pairs'
  }
}

/** A tiny 4×4 window sketch of what the objective rewards. */
export function GoalGlyph({ card, size = 22 }: { card: ObjectiveCard; size?: number }) {
  const fills: (string | null)[] = Array.from({ length: 16 }, () => null)
  let pips = 0
  if (card.kind === 'private') {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="goal-glyph">
        <path
          d="M10 2 17 8 10 18 3 8Z"
          fill={JEWEL[card.color]}
          stroke="var(--lead)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M3 8h14M10 2 7.5 8 10 18l2.5-10Z" fill="none" stroke="rgb(255 255 255 / .45)" strokeWidth=".9" />
      </svg>
    )
  }
  const s = card.strategy
  if (s.kind === 'lineDiversity') {
    const palette = s.trait === 'color' ? JEWELS : GOLDS
    for (let i = 0; i < 4; i++) fills[s.axis === 'row' ? 4 + i : i * 4 + 1] = palette[i]!
  } else if (s.kind === 'diagonalDiversity') {
    ;[0, 5, 10, 15, 3, 6, 9, 12].forEach((cell, i) => (fills[cell] = JEWELS[i % 5]!))
  } else if (s.kind === 'colorQuorum') {
    ;[0, 1, 6, 7, 8, 9, 14, 15].forEach((cell, i) => (fills[cell] = JEWELS[Math.floor(i / 2) % 5]!))
  } else {
    pips = s.parity === 'odd' ? 3 : 4
  }
  if (pips > 0) {
    const spots = pips === 3 ? [[5.5, 5.5], [10, 10], [14.5, 14.5]] : [[6, 6], [14, 6], [6, 14], [14, 14]]
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="goal-glyph">
        <rect x="1.5" y="1.5" width="17" height="17" rx="4" fill="#fbf0dc" stroke="var(--lead)" strokeWidth="1.6" />
        {spots.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.9" fill="var(--lead)" />
        ))}
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="goal-glyph">
      <rect x="0.5" y="0.5" width="19" height="19" rx="3" fill="var(--lead)" />
      {fills.map((fill, i) => (
        <rect
          key={i}
          x={1.6 + (i % 4) * 4.3}
          y={1.6 + Math.floor(i / 4) * 4.3}
          width="3.5"
          height="3.5"
          rx="0.8"
          fill={fill ?? '#3a2d55'}
        />
      ))}
    </svg>
  )
}

function cards(game: Game): ObjectiveCard[] {
  const { publics, privateObjective } = game.objectives
  return [...publics, privateObjective]
}

function pointsFor(lines: readonly ScoreLine[], id: string): number {
  return lines.find((line) => line.objectiveId === id)?.points ?? 0
}

/** Four goal chips under the HUD with live points; tap opens the full cards. */
export function Objectives({
  game,
  lines,
  onOpen,
}: {
  game: Game
  lines: readonly ScoreLine[]
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      className="goals"
      data-testid="objectives"
      aria-label="Goals scored at the end. Show details"
      onClick={onOpen}
    >
      {cards(game).map((card) => {
        const points = pointsFor(lines, card.id)
        return (
          <span
            key={card.id}
            data-testid={`objective-${card.id}`}
            title={card.description}
            className={`goal ${card.kind === 'private' ? 'goal--secret' : ''} ${points > 0 ? 'goal--live' : ''}`}
          >
            <span className="goal__top">
              <GoalGlyph card={card} />
              <span key={points} className="goal__pts">
                {points > 0 ? `+${points}` : '0'}
              </span>
            </span>
            <span className="goal__name">{shortName(card)}</span>
          </span>
        )
      })}
    </button>
  )
}

/** Sheet body: every dealt goal in plain words with what it is worth right now. */
export function GoalDetails({ game, lines }: { game: Game; lines: readonly ScoreLine[] }) {
  return (
    <ul className="goal-list">
      {cards(game).map((card) => (
        <li key={card.id} className={`goal-row ${card.kind === 'private' ? 'goal-row--secret' : ''}`}>
          <GoalGlyph card={card} size={40} />
          <div>
            <strong>
              {card.name}
              {card.kind === 'private' && <span className="goal-row__tag">Only you</span>}
            </strong>
            <p>{card.description}</p>
          </div>
          <span className="goal-row__pts">+{pointsFor(lines, card.id)}</span>
        </li>
      ))}
    </ul>
  )
}
