import type { GameConfig } from './config'
import { GameError } from './errors'
import { shuffled } from './sample'
import { DIE_COLORS } from './types'
import type { Die } from './types'
import type { Rng } from './rng'

/**
 * The dice bag (pitch §8.2): the sole owner of randomness consumption order.
 * Built from the run config (5 colors x 6 values x `copiesPerDie`), shuffled once
 * with the injected rng. Draws take from the front; returned dice go to the back
 * (a real bag churns, and the fixed policy keeps golden-master runs stable).
 */
export class DiceBag {
  #dice: Die[]

  constructor(config: GameConfig, rng: Rng) {
    const all: Die[] = []
    for (const color of DIE_COLORS) {
      for (let value = 1; value <= 6; value++) {
        for (let copy = 0; copy < config.copiesPerDie; copy++) {
          all.push({ color, value })
        }
      }
    }
    this.#dice = shuffled(all, rng)
  }

  get remainingCount(): number {
    return this.#dice.length
  }

  /** Copy of the remaining contents (for tests and debugging UIs). */
  contents(): Die[] {
    return [...this.#dice]
  }

  /** Draws n dice from the front, or throws the `emptyBag` violation. */
  draw(n: number): Die[] {
    if (n > this.#dice.length) throw new GameError({ kind: 'emptyBag' })
    return this.#dice.splice(0, n)
  }

  /** Returns dice to the back of the bag (unselected draft dice at refresh). */
  return(dice: readonly Die[]): void {
    this.#dice.push(...dice)
  }
}
