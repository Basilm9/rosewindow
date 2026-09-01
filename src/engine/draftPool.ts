import { GameError } from './errors'
import { sameDie } from './types'
import type { Die } from './types'

/**
 * The dice currently visible for selection this round (pitch §8.2). The Game
 * moves a drafted die out of the pool into the hand; unselected dice are
 * returned to the bag at refresh.
 */
export class DraftPool {
  #dice: Die[]

  constructor(dice: readonly Die[]) {
    this.#dice = [...dice]
  }

  /** Mutation-safe view of the visible dice. */
  get dice(): readonly Die[] {
    return [...this.#dice]
  }

  get size(): number {
    return this.#dice.length
  }

  /** Removes the first die matching by color+value, or throws `dieNotInPool`. */
  take(die: Die): Die {
    const index = this.#dice.findIndex((candidate) => sameDie(candidate, die))
    if (index === -1) throw new GameError({ kind: 'dieNotInPool' })
    return this.#dice.splice(index, 1)[0]!
  }

  putBack(dice: readonly Die[]): void {
    this.#dice.push(...dice)
  }

  clear(): void {
    this.#dice = []
  }
}
