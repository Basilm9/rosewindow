/**
 * Type-level test (inc-45 temporary check T), checked by `pnpm typecheck` (tsc includes `tests`);
 * not a Vitest file. Each event's `toData()` must be assignable to the legacy plain union, and a
 * misspelled kind must not be. Since inc 47 `src/engine/events.ts` re-exports the class union, so
 * the legacy plain union is `GameEventData` (structurally the pre-47 engine union).
 */
import type {
  GameEventData as LegacyGameEvent,
  BeamTracedEvent,
  DiePlacedEvent,
  DraftPoolRefreshedEvent,
  GameOverEvent,
  PlacementRejectedEvent,
  RoundForfeitedEvent,
  RoundScoredEvent,
} from '../../src/model/events'

/** T1–T7: one assignability check per event class. */
export type ToDataAssignableToLegacy = [
  ReturnType<DiePlacedEvent['toData']> extends LegacyGameEvent ? true : never,
  ReturnType<PlacementRejectedEvent['toData']> extends LegacyGameEvent ? true : never,
  ReturnType<DraftPoolRefreshedEvent['toData']> extends LegacyGameEvent ? true : never,
  ReturnType<BeamTracedEvent['toData']> extends LegacyGameEvent ? true : never,
  ReturnType<RoundScoredEvent['toData']> extends LegacyGameEvent ? true : never,
  ReturnType<RoundForfeitedEvent['toData']> extends LegacyGameEvent ? true : never,
  ReturnType<GameOverEvent['toData']> extends LegacyGameEvent ? true : never,
]

/** T1–T7 forced: a `never` element above would make this tuple literal a compile error. */
export const toDataAssignable: ToDataAssignableToLegacy = [true, true, true, true, true, true, true]

/** T8: direct assignment of each toData() to the legacy union compiles. */
export function assignToLegacy(
  a: DiePlacedEvent,
  b: PlacementRejectedEvent,
  c: DraftPoolRefreshedEvent,
  d: BeamTracedEvent,
  e: RoundScoredEvent,
  f: RoundForfeitedEvent,
  g: GameOverEvent,
): LegacyGameEvent[] {
  return [a.toData(), b.toData(), c.toData(), d.toData(), e.toData(), f.toData(), g.toData()]
}

/** T9 control: a misspelled kind is rejected by the legacy union. */
// @ts-expect-error 'roundScore' is not a legacy GameEvent kind
export const misspelled: LegacyGameEvent = { kind: 'roundScore', round: 1, delta: 5 }
