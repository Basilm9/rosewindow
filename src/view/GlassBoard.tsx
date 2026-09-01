import type { Game } from '../engine/game'
import type { CellConstraint, Die, Direction, Position } from '../engine/types'
import { DIE_STYLES } from './palette'
import { DieFace } from './Die'

const ARROW_BY_DIRECTION: Record<Direction, string> = {
  north: '↑',
  east: '→',
  south: '↓',
  west: '←',
}

const ARROW_POSITION: Record<Direction, string> = {
  north: 'top-0 left-1/2 -translate-x-1/2',
  south: 'bottom-0 left-1/2 -translate-x-1/2',
  east: 'right-0 top-1/2 -translate-y-1/2',
  west: 'left-0 top-1/2 -translate-y-1/2',
}

function describeConstraint(constraint: CellConstraint): string {
  if (constraint.kind === 'color') return `demands ${constraint.color} glass`
  if (constraint.kind === 'value') return `demands value ${constraint.value}`
  return 'no demand'
}

function ConstraintMark({ constraint }: { constraint: CellConstraint }) {
  if (constraint.kind === 'color') {
    const style = DIE_STYLES[constraint.color]
    return (
      <span
        title={`demands ${constraint.color}`}
        className={`absolute left-1 top-1 h-3 w-3 rounded-full ${style.fill} ring-1 ${style.ring}`}
      />
    )
  }
  if (constraint.kind === 'value') {
    return (
      <span className="absolute left-1 top-1 rounded bg-neutral-950/90 px-1 text-[10px] font-semibold text-neutral-300 ring-1 ring-neutral-700">
        {constraint.value}
      </span>
    )
  }
  return null
}

function Cell({
  row,
  col,
  constraint,
  die,
  isEntry,
  entryDirection,
}: {
  row: number
  col: number
  constraint: CellConstraint
  die: Die | null
  isEntry: boolean
  entryDirection: Direction
}) {
  return (
    <div
      role="gridcell"
      aria-label={
        die !== null
          ? `row ${row}, column ${col}, ${die.color} ${die.value} die`
          : `row ${row}, column ${col}, empty`
      }
      data-testid={`cell-r${row}c${col}`}
      className={`relative flex h-20 w-20 items-center justify-center rounded-lg bg-neutral-800/60 ring-2 ring-neutral-950 ${
        isEntry ? 'ring-amber-400/90' : ''
      }`}
      title={describeConstraint(constraint)}
    >
      <ConstraintMark constraint={constraint} />
      {die !== null && <DieFace die={die} testId={`die-r${row}c${col}`} />}
      {isEntry && (
        <span
          aria-label={`beam enters heading ${entryDirection}`}
          data-testid="entry-arrow"
          className={`absolute ${ARROW_POSITION[entryDirection]} text-sm text-amber-300 drop-shadow`}
        >
          {ARROW_BY_DIRECTION[entryDirection]}
        </span>
      )}
    </div>
  )
}

export function GlassBoard({ game }: { game: Game }) {
  const window = game.window
  if (window === null) return null
  const entry = game.currentEntry
  return (
    <div
      role="grid"
      aria-label={`Glass window pattern: ${window.pattern.name}`}
      data-testid="glass-board"
      className="grid grid-cols-4 gap-1.5 rounded-2xl bg-neutral-950 p-3 ring-4 ring-neutral-800"
    >
      {window.constraints.map((rowConstraints, row) =>
        rowConstraints.map((constraint, col) => {
          const position: Position = { row, col }
          return (
            <Cell
              key={`${row}-${col}`}
              row={row}
              col={col}
              constraint={constraint}
              die={window.dieAt(position)}
              isEntry={entry.position.row === row && entry.position.col === col}
              entryDirection={entry.direction}
            />
          )
        }),
      )}
    </div>
  )
}
