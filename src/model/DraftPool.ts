import { Die } from './Die'
import type { DieData } from './Die'
import { PlacementError } from './GameError'

/**
 * The dice currently visible for selection this round (FR-3.2, FR-3.4).
 *
 * `DraftPool` only holds and hands out dice; hand management (at most one held die, FR-3.3)
 * stays in `Game`. Dice match by color and value, never by identity, so plain data restored
 * from a recording finds the live die (FR-4.3). {@link DraftPool.contains} is the one
 * pool-membership rule in the model; the placement validator's `dieNotInPool` law calls it.
 * The order of {@link DraftPool.dice} is the draw order and is preserved: the auto-player and
 * the golden master pick dice by index.
 */
export class DraftPool {
  /** Visible dice in draw order; returned dice are appended at the end. */
  #dice: Die[]

  /**
   * Copies `dice`; later changes to the caller's array do not affect the pool.
   * @param dice - the visible dice, in draw order.
   */
  constructor(dice: readonly Die[]) {
    this.#dice = [...dice]
  }

  /**
   * Mutation-safe copy of the visible dice, in order.
   * @returns a new array; changing it does not affect the pool.
   */
  get dice(): readonly Die[] {
    return [...this.#dice]
  }

  /**
   * Number of visible dice.
   * @returns the pool size.
   */
  get size(): number {
    return this.#dice.length
  }

  /**
   * The pool-membership rule: true when `dice` holds a die with the same color and value.
   * This is the only place in the model that decides pool membership; `PlacementValidator`
   * and `Game.legalPlacementsFor` call it rather than re-implementing it.
   * @param dice - the dice to search (a pool's contents, or pool plus held die).
   * @param die - the die to look for; compared with {@link Die.equals}.
   * @returns `true` when some die in `dice` equals `die` by color and value.
   */
  static contains(dice: readonly DieData[], die: DieData): boolean {
    return dice.some((candidate) => Die.equals(candidate, die))
  }

  /**
   * True when a die with the same color and value is visible; delegates to the static
   * {@link DraftPool.contains} rule.
   * @param die - the die to look for.
   * @returns `true` when the pool holds an equal die.
   */
  contains(die: DieData): boolean {
    return DraftPool.contains(this.#dice, die)
  }

  /**
   * Removes and returns the first die equal by color and value. The returned object is the
   * pool's own {@link Die} instance, not the argument.
   * @param die - the die to take; matched by color and value.
   * @returns the removed die.
   * @throws PlacementError `dieNotInPool` when no visible die matches; the pool is unchanged
   *   (NFR-2.1).
   */
  take(die: DieData): Die {
    const index = this.#dice.findIndex((candidate) => Die.equals(candidate, die))
    if (index === -1) throw new PlacementError({ kind: 'dieNotInPool' })
    return this.#dice.splice(index, 1)[0]!
  }

  /**
   * Appends dice at the end of the pool (a returned held die, FR-3.3/FR-3.6); a re-selected die
   * therefore moves to the end of the tray.
   * @param dice - the dice to append, in order.
   */
  putBack(dice: readonly Die[]): void {
    this.#dice.push(...dice)
  }

  /**
   * Empties the pool (end of round; `Game` returns the dice to the bag first). Copies previously
   * obtained from {@link DraftPool.dice} are unaffected.
   */
  clear(): void {
    this.#dice = []
  }
}
