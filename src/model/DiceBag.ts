import type { GameConfig } from './GameConfig'
import { DIE_COLORS, Die } from './Die'
import { GameError } from './GameError'
import { SeededRandom } from './SeededRandom'
import type { Rng } from './SeededRandom'

/**
 * The run's dice bag; the sole owner of dice-randomness consumption order (FR-3.1, NFR-1.2).
 *
 * Built from the run config (5 colours × 6 values × `copiesPerDie` = 90 dice by default) in
 * `DIE_COLORS` × value × copy order and shuffled exactly once with the injected rng — the bag is
 * the first consumer of the run's stream (89 draws for 90 dice). Draws take from the front;
 * returned dice go to the back. Any change to the build order, the shuffle or this draw policy
 * changes every later random draw and the golden master (FR-1.4, FR-11.2, FR-11.4).
 */
export class DiceBag {
  /** Remaining dice; index 0 is the next die drawn. */
  #dice: Die[]

  /**
   * Builds `copiesPerDie` × 5 colours × 6 values dice and shuffles them once.
   * @param config - run parameters (only `copiesPerDie` is read).
   * @param rng - injected stream; `Game` passes `new SeededRandom(config.seed).next`.
   */
  constructor(config: GameConfig, rng: Rng) {
    const all: Die[] = []
    for (const color of DIE_COLORS) {
      for (let value = Die.MIN_VALUE; value <= Die.MAX_VALUE; value++) {
        for (let copy = 0; copy < config.copiesPerDie; copy++) {
          all.push(new Die(color, value))
        }
      }
    }
    this.#dice = SeededRandom.shuffled(all, rng)
  }

  /**
   * Dice left in the bag.
   * @returns the number of dice that can still be drawn.
   */
  get remainingCount(): number {
    return this.#dice.length
  }

  /**
   * Copy of the remaining dice in draw order (tests and debugging UIs); mutating it does not
   * affect the bag.
   * @returns a new array, index 0 being the next die drawn.
   */
  contents(): Die[] {
    return [...this.#dice]
  }

  /**
   * Removes and returns the first `n` dice. Validation happens before any removal, so a
   * rejected call leaves the bag unchanged (NFR-2.1).
   * @param n - how many dice to draw; a non-negative integer.
   * @returns the drawn dice in draw order.
   * @throws GameError `invalidArgument` if `n` is negative or not an integer (checked first).
   * @throws GameError `emptyBag` if `n` exceeds {@link DiceBag.remainingCount}.
   */
  draw(n: number): Die[] {
    if (!Number.isInteger(n) || n < 0) {
      throw new GameError({ kind: 'invalidArgument', detail: `cannot draw ${n} dice` })
    }
    if (n > this.#dice.length) throw new GameError({ kind: 'emptyBag' })
    return this.#dice.splice(0, n)
  }

  /**
   * Appends dice to the back of the bag (unselected draft dice at refresh, recast and forfeit);
   * they become drawable again after the current contents.
   * @param dice - the dice to return, in the order they go back.
   */
  return(dice: readonly Die[]): void {
    this.#dice.push(...dice)
  }
}
