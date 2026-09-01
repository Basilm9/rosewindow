import { useState } from 'react'
import type { Game } from '../engine/game'
import type { PlacementViolation } from '../engine/errors'
import type { CellConstraint, Die, Direction, Position } from '../engine/types'
import { DIE_STYLES } from './palette'
import { DieFace } from './Die'

function cellKeyOf(position: Position): string {
  return `${position.row},${position.col}`
}

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
        className={`absolute left-1 top-1 z-10 h-3 w-3 rounded-full ${style.fill} ring-1 ${style.ring}`}
      />
    )
  }
  if (constraint.kind === 'value') {
    return (
      <span className="absolute left-1 top-1 z-10 rounded bg-neutral-950/90 px-1 text-[10px] font-semibold text-neutral-300 ring-1 ring-neutral-700">
        {constraint.value}
      </span>
    )
  }
  return null
}

export interface GlassBoardProps {
  game: Game
  legalPreview: Map<string, PlacementViolation | null>
  rejection: { position: Position; kind: string; key: number } | null
  lastPlaced: { position: Position; key: number } | null
  onCellClick: (position: Position) => void
}

function Cell({
  row,
  col,
  constraint,
  die,
  isEntry,
  entryDirection,
  hand,
  preview,
  hovered,
  isOffending,
  onHover,
  onClick,
  rejecting,
  justPlaced,
}: {
  row: number
  col: number
  constraint: CellConstraint
  die: Die | null
  isEntry: boolean
  entryDirection: Direction
  hand: Die | null
  preview: PlacementViolation | null
  hovered: boolean
  isOffending: boolean
  onHover: (position: Position | null) => void
  onClick: (position: Position) => void
  rejecting: boolean
  justPlaced: boolean
}) {
  const position: Position = { row, col }
  const showGhost = hovered && die === null && hand !== null
  const legal = preview === null

  const hoverRing = showGhost
    ? legal
      ? 'ring-emerald-400/90'
      : 'ring-red-500/90'
    : isEntry
      ? 'ring-amber-400/90'
      : ''

  return (
    <div
      role="gridcell"
      aria-label={
        die !== null
          ? `row ${row}, column ${col}, ${die.color} ${die.value} die`
          : `row ${row}, column ${col}, empty`
      }
      data-testid={`cell-r${row}c${col}`}
      data-rejected={rejecting ? 'true' : undefined}
      data-offending={isOffending ? 'true' : undefined}
      title={describeConstraint(constraint)}
      onMouseEnter={() => onHover(position)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(position)}
      className={`relative flex h-20 w-20 items-center justify-center rounded-lg bg-neutral-800/60 ring-2 ring-neutral-950 transition-shadow ${
        hoverRing || ''
      } ${rejecting ? 'animate-reject bg-red-900/40' : ''} ${
        justPlaced ? 'animate-place' : ''
      } ${die === null && hand !== null ? 'cursor-pointer' : ''} ${isOffending ? 'ring-red-400 ring-4' : ''}`}
    >
      <ConstraintMark constraint={constraint} />
      {die !== null && <DieFace die={die} testId={`die-r${row}c${col}`} />}
      {showGhost && (
        <span
          data-testid={`ghost-r${row}c${col}`}
          data-legal={legal ? 'true' : 'false'}
          aria-label={`preview ${hand!.color} ${hand!.value}, ${legal ? 'legal' : 'illegal'}`}
          className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg ${
            legal ? 'bg-emerald-500/10' : 'bg-red-500/15'
          }`}
        >
          <span className={legal ? 'opacity-70' : 'opacity-50 grayscale-[40%]'}>
            <DieFace die={hand} />
          </span>
          {!legal && (
            <span className="absolute right-1 top-1 text-xs font-bold text-red-400">✕</span>
          )}
        </span>
      )}
      {isEntry && (
        <span
          aria-label={`beam enters heading ${entryDirection}`}
          data-testid="entry-arrow"
          className={`absolute ${ARROW_POSITION[entryDirection]} z-10 text-sm text-amber-300 drop-shadow`}
        >
          {ARROW_BY_DIRECTION[entryDirection]}
        </span>
      )}
    </div>
  )
}

export function GlassBoard({
  game,
  legalPreview,
  rejection,
  lastPlaced,
  onCellClick,
}: GlassBoardProps) {
  const window = game.window
  const [hovered, setHovered] = useState<Position | null>(null)
  if (window === null) return null
  const entry = game.currentEntry
  const hand = game.hand
  /** The hovered cell's offending neighbors, outlined across the whole grid. */
  const hoveredPreview =
    hovered !== null && hand !== null ? legalPreview.get(cellKeyOf(hovered)) ?? null : null
  const offendingCells: Position[] =
    hoveredPreview?.kind === 'adjacencyViolation'
      ? [...hoveredPreview.offendingNeighbors]
      : []

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
          const key = `${row}-${col}`
          return (
            <Cell
              key={key}
              row={row}
              col={col}
              constraint={constraint}
              die={window.dieAt(position)}
              isEntry={entry.position.row === row && entry.position.col === col}
              entryDirection={entry.direction}
              hand={hand}
              preview={legalPreview.get(`${row},${col}`) ?? null}
              hovered={hovered?.row === row && hovered?.col === col}
              isOffending={offendingCells.some((n) => n.row === row && n.col === col)}
              onHover={setHovered}
              onClick={onCellClick}
              rejecting={rejection?.position.row === row && rejection?.position.col === col}
              justPlaced={lastPlaced?.position.row === row && lastPlaced?.position.col === col}
            />
          )
        }),
      )}
    </div>
  )
}
