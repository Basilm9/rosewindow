import { useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import type { Game } from '../engine/game'
import type { PlacementViolation } from '../engine/errors'
import type { CellConstraint, Die, Direction, Position } from '../engine/types'
import { DieFace } from './Die'
import { BeamLayer } from './BeamLayer'
import type { BeamPath, BeamSegment } from '../engine/beamTracer'
import './gameplay.css'

const HELD_VAR = {
  red: 'ruby',
  yellow: 'amber',
  blue: 'cobalt',
  green: 'emerald',
  purple: 'amethyst',
} as const

function cellKeyOf(position: Position): string {
  return `${position.row},${position.col}`
}


function describeConstraint(constraint: CellConstraint): string {
  if (constraint.kind === 'color') return `requires ${constraint.color} glass`
  if (constraint.kind === 'value') return `requires value ${constraint.value}`
  return 'any color or value'
}

function ConstraintMark({
  constraint,
  occupied,
}: {
  constraint: CellConstraint
  occupied: boolean
}) {
  if (constraint.kind === 'open') return null
  return (
    <span
      title={describeConstraint(constraint)}
      aria-hidden
      className={`glass-constraint ${occupied ? 'glass-constraint--occupied' : ''} ${constraint.kind === 'color' ? `glass-${constraint.color}` : 'glass-constraint--value'}`}
    >
      {constraint.kind === 'color' ? (
        <>
          <span className="glass-constraint__gem" />
          <span className="glass-constraint__label">{constraint.color}</span>
        </>
      ) : (
        constraint.value
      )}
    </span>
  )
}

export interface GlassBoardProps {
  game: Game
  legalPreview: Map<string, PlacementViolation | null>
  rejection: { position: Position; kind: string; key: number } | null
  lastPlaced: { position: Position; key: number } | null
  beam: { path: BeamPath; key: number } | null
  litCells: ReadonlySet<string>
  lastLit: { position: Position; key: number } | null
  animating: boolean
  onCellClick: (position: Position) => void
  onBeamDone: () => void
  onBeamStrike: (segment: BeamSegment, index: number, multiplier: number) => void
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
  justLit,
  onHover,
  onFocus,
  onClick,
  rejecting,
  justPlaced,
  tabIndex,
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
  justLit: number
  onHover: (position: Position | null) => void
  onFocus: (position: Position) => void
  onClick: (position: Position) => void
  rejecting: boolean
  justPlaced: number
  tabIndex: number
}) {
  const position: Position = { row, col }
  const showGhost = hovered && die === null && hand !== null
  const legal = preview === null
  const hint = die === null && hand !== null && legal

  return (
    <div
      role="gridcell"
      tabIndex={tabIndex}
      aria-rowindex={row + 1}
      aria-colindex={col + 1}
      aria-label={
        die !== null
          ? `row ${row}, column ${col}, ${die.color} ${die.value} die`
          : `row ${row}, column ${col}, empty, ${describeConstraint(constraint)}${hand !== null ? `, ${legal ? 'legal placement' : 'unavailable placement'}` : ''}`
      }
      data-testid={`cell-r${row}c${col}`}
      data-row={row}
      data-col={col}
      data-rejected={rejecting ? 'true' : undefined}
      data-offending={isOffending ? 'true' : undefined}
      data-legal={hand !== null && die === null ? String(legal) : undefined}
      title={describeConstraint(constraint)}
      onMouseEnter={() => onHover(position)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onFocus(position)}
      onBlur={() => onHover(null)}
      onClick={() => onClick(position)}
      className={`glass-cell ${die !== null ? 'glass-cell--occupied' : ''} ${isEntry ? 'glass-cell--entry' : ''} ${hint ? 'glass-cell--legal' : ''} ${rejecting ? 'glass-cell--rejected animate-reject' : ''} ${isOffending ? 'glass-cell--offending' : ''} ${justPlaced ? 'animate-place' : ''}`}
    >
      <ConstraintMark constraint={constraint} occupied={die !== null} />
      {die !== null && (
        <DieFace
          die={die}
          fluid
          lit={lit}
          testId={`die-r${row}c${col}`}
          className={justPlaced || justLit ? 'animate-place' : ''}
        />
      )}
      {justPlaced > 0 && (
        <span
          key={`burst-${justPlaced}`}
          className="burst-ring"
          data-testid={`burst-r${row}c${col}`}
        >
          <span className="spark" style={{ '--dx': '-56%', '--dy': '-64%' } as CSSProperties} />
          <span
            className="spark"
            style={{ '--dx': '58%', '--dy': '-52%', animationDelay: '40ms' } as CSSProperties}
          />
          <span
            className="spark"
            style={{ '--dx': '-48%', '--dy': '58%', animationDelay: '80ms' } as CSSProperties}
          />
          <span
            className="spark"
            style={{ '--dx': '62%', '--dy': '48%', animationDelay: '120ms' } as CSSProperties}
          />
        </span>
      )}
      {justLit > 0 && <span key={`flash-${justLit}`} className="strike-flash" />}
      {showGhost && (
        <span
          data-testid={`ghost-r${row}c${col}`}
          data-legal={legal ? 'true' : 'false'}
          aria-label={`preview ${hand.color} ${hand.value}, ${legal ? 'legal' : 'illegal'}`}
          className={`glass-ghost ${legal ? 'glass-ghost--legal' : 'glass-ghost--illegal'}`}
        >
          <DieFace die={hand} fluid />
          {!legal && (
            <span className="glass-ghost__cross" aria-hidden>
              ×
            </span>
          )}
        </span>
      )}
      {isEntry && (
        <span
          aria-label={`beam enters heading ${entryDirection}`}
          data-testid="entry-arrow"
          className={`glass-entry glass-entry--${entryDirection}`}
        >
          <span className="glass-entry__rays" aria-hidden />
          <span className="glass-entry__sun" aria-hidden />
          <svg className="glass-entry__chevron" viewBox="0 0 24 24" aria-hidden>
            <path d="M5 8l7 8 7-8" />
          </svg>
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
  lastLit,
  animating,
  onCellClick,
  onBeamDone,
  onBeamStrike,
}: GlassBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<Position | null>(null)
  const [activeCell, setActiveCell] = useState<Position>({ row: 0, col: 0 })
  const window = game.window
  if (window === null) return null
  const entry = (animating ? beam?.path.segments[0] : undefined) ?? game.currentEntry
  const hand = game.hand
  const hoveredPreview =
    hovered !== null && hand !== null ? (legalPreview.get(cellKeyOf(hovered)) ?? null) : null
  const offendingCells =
    hoveredPreview?.kind === 'adjacencyViolation' ? hoveredPreview.offendingNeighbors : []

  function onBoardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) return
    const size = game.config.gridSize
    let { row, col } = activeCell
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!animating) onCellClick(activeCell)
      return
    }
    switch (event.key) {
      case 'ArrowUp':
        row = Math.max(0, row - 1)
        break
      case 'ArrowDown':
        row = Math.min(size - 1, row + 1)
        break
      case 'ArrowLeft':
        col = Math.max(0, col - 1)
        break
      case 'ArrowRight':
        col = Math.min(size - 1, col + 1)
        break
      case 'Home':
        col = 0
        if (event.ctrlKey) row = 0
        break
      case 'End':
        col = size - 1
        if (event.ctrlKey) row = size - 1
        break
      default:
        return
    }
    event.preventDefault()
    boardRef.current?.querySelector<HTMLElement>(`[data-testid="cell-r${row}c${col}"]`)?.focus()
  }

  return (
    <div
      className={`glass-board-frame ${animating ? 'glass-board-frame--beam' : ''}`}
      style={hand !== null ? ({ '--held': `var(--${HELD_VAR[hand.color]})` } as CSSProperties) : undefined}
    >
      <span className="glass-board-frame__rivet glass-board-frame__rivet--tl" aria-hidden />
      <span className="glass-board-frame__rivet glass-board-frame__rivet--tr" aria-hidden />
      <span className="glass-board-frame__rivet glass-board-frame__rivet--bl" aria-hidden />
      <span className="glass-board-frame__rivet glass-board-frame__rivet--br" aria-hidden />
      <div
        ref={boardRef}
        role="grid"
        aria-label={`Glass window pattern: ${window.pattern.name}`}
        aria-rowcount={game.config.gridSize}
        aria-colcount={game.config.gridSize}
        aria-busy={animating}
        data-testid="glass-board"
        className={`glass-board ${hand !== null && !animating ? 'glass-board--holding' : ''}`}
        onKeyDown={onBoardKeyDown}
      >
        {beam !== null && (
          <BeamLayer key={beam.key} path={beam.path} onDone={onBeamDone} onStrike={onBeamStrike} />
        )}
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
                justLit={
                  lastLit?.position.row === row && lastLit?.position.col === col ? lastLit.key : 0
                }
                onHover={setHovered}
                onFocus={(position) => {
                  setActiveCell(position)
                  setHovered(position)
                }}
                onClick={(position) => {
                  if (!animating) onCellClick(position)
                }}
                rejecting={rejection?.position.row === row && rejection?.position.col === col}
                justPlaced={
                  lastPlaced?.position.row === row && lastPlaced?.position.col === col
                    ? lastPlaced.key
                    : 0
                }
                tabIndex={activeCell.row === row && activeCell.col === col ? 0 : -1}
              />
            )
          }),
        )}
      </div>
    </div>
  )
}
