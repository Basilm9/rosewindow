import { useState } from 'react'
import type { Game } from '../engine/game'
import type { PlacementViolation } from '../engine/errors'
import type { CellConstraint, Die, Direction, Position } from '../engine/types'
import { DIE_STYLES } from './palette'
import { DieFace } from './Die'
import { BeamLayer } from './BeamLayer'
import type { BeamPath, BeamSegment } from '../engine/beamTracer'

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
  north: 'top-[1%] left-1/2 -translate-x-1/2',
  south: 'bottom-[1%] left-1/2 -translate-x-1/2',
  east: 'right-[1%] top-1/2 -translate-y-1/2',
  west: 'left-[1%] top-1/2 -translate-y-1/2',
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
        className={`absolute left-[6%] top-[6%] z-10 h-[16%] w-[16%] rounded-full ${style.fill} ring-1 ${style.ring}`}
      />
    )
  }
  if (constraint.kind === 'value') {
    return (
      <span className="absolute left-[6%] top-[5%] z-10 flex h-[20%] min-w-[20%] items-center justify-center rounded-[20%] bg-neutral-950/90 px-[3%] text-[min(2.4cqw,0.65rem)] font-semibold text-neutral-300 ring-1 ring-neutral-700">
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
  beam: { path: BeamPath; key: number } | null
  litCells: ReadonlySet<string>
  animating: boolean
  onCellClick: (position: Position) => void
  onBeamDone: () => void
  onBeamStrike: (segment: BeamSegment) => void
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
  lit,
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
  lit: boolean
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
      className={`relative flex items-center justify-center overflow-hidden rounded-[12%] bg-gradient-to-br from-neutral-800/70 to-neutral-900/70 ring-2 ring-neutral-950 transition-[box-shadow,background-color] duration-200 ${
        hoverRing || ''
      } ${rejecting ? 'animate-reject !bg-red-900/50' : ''} ${
        justPlaced ? 'animate-place' : ''
      } ${die === null && hand !== null ? 'cursor-pointer' : ''} ${
        isOffending ? 'ring-4 ring-red-400' : ''
      }`}
    >
      <ConstraintMark constraint={constraint} />
      {die !== null && (
        <DieFace
          die={die}
          fluid
          lit={lit}
          testId={`die-r${row}c${col}`}
          className={justPlaced ? 'animate-place' : ''}
        />
      )}
      {showGhost && (
        <span
          data-testid={`ghost-r${row}c${col}`}
          data-legal={legal ? 'true' : 'false'}
          aria-label={`preview ${hand!.color} ${hand!.value}, ${legal ? 'legal' : 'illegal'}`}
          className={`pointer-events-none absolute inset-0 z-10 rounded-[12%] outline-2 outline-dashed ${
            legal
              ? 'bg-emerald-400/15 outline-emerald-300/90'
              : 'bg-red-500/25 outline-red-400/90'
          }`}
        >
          <span className={`absolute inset-0 ${legal ? 'opacity-85' : 'opacity-60 grayscale-[30%]'}`}>
            <DieFace die={hand} fluid />
          </span>
          {!legal && (
            <span className="absolute right-[5%] top-[3%] text-[min(4cqw,1rem)] font-bold text-red-400 drop-shadow">
              ✕
            </span>
          )}
        </span>
      )}
      {isEntry && (
        <span
          aria-label={`beam enters heading ${entryDirection}`}
          data-testid="entry-arrow"
          className={`absolute ${ARROW_POSITION[entryDirection]} z-10 text-[min(3.8cqw,1rem)] text-amber-300 drop-shadow`}
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
  beam,
  litCells,
  animating,
  onCellClick,
  onBeamDone,
  onBeamStrike,
}: GlassBoardProps) {
  const window = game.window
  const [hovered, setHovered] = useState<Position | null>(null)
  if (window === null) return null
  const entry = game.currentEntry
  const hand = game.hand
  const hoveredPreview =
    hovered !== null && hand !== null ? legalPreview.get(cellKeyOf(hovered)) ?? null : null
  const offendingCells: Position[] =
    hoveredPreview?.kind === 'adjacencyViolation' ? [...hoveredPreview.offendingNeighbors] : []

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(92vw,560px)]">
      {/* cathedral bloom behind the lead came */}
      <div className="pointer-events-none absolute inset-[-4%] rounded-[8%] bg-[radial-gradient(circle_at_50%_42%,rgba(251,191,36,0.10)_0%,rgba(168,85,247,0.06)_45%,transparent_70%)]" />
      <div
        role="grid"
        aria-label={`Glass window pattern: ${window.pattern.name}`}
        data-testid="glass-board"
        className="@container absolute inset-0 grid grid-cols-4 grid-rows-4 gap-[2%] rounded-[4%] bg-neutral-950 p-[3%] ring-4 ring-neutral-800 shadow-[inset_0_0_46px_rgba(0,0,0,0.85),0_0_0_1px_rgba(251,191,36,0.14),0_18px_60px_rgba(0,0,0,0.6)]"
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
                hand={animating ? null : hand}
                preview={animating ? null : (legalPreview.get(cellKeyOf(position)) ?? null)}
                hovered={hovered?.row === row && hovered?.col === col}
                isOffending={offendingCells.some((n) => n.row === row && n.col === col)}
                lit={litCells.has(cellKeyOf(position))}
                onHover={setHovered}
                onClick={onCellClick}
                rejecting={rejection?.position.row === row && rejection?.position.col === col}
                justPlaced={lastPlaced?.position.row === row && lastPlaced?.position.col === col}
              />
            )
          }),
        )}
      </div>
      {beam !== null && (
        <BeamLayer
          key={beam.key}
          path={beam.path}
          onDone={onBeamDone}
          onStrike={(segment) => onBeamStrike(segment)}
        />
      )}
    </div>
  )
}
