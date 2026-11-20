# Prompt 46: Model Event Tests

**CRITICAL: Write `tests/model/events.test.ts` proving each of the seven event classes extends `ModelEvent`, carries its exact `kind` literal and payload, is immutable, keeps `source` out of structural equality, and converts with `toData()` to the legacy union member — and that `notifyChanged` delivers the very same instance to listeners.**

---

### INCREMENT 46: Event class unit tests
- **Status:** Standard
- **Dependencies:** Prompts 03, 04, 45
- **Reference implementation:** `src/engine/events.ts` (the union literals are the expected `toData()` values); `tests/engine/game.test.ts` (event-kind sequence)
- **Context to attach:** `ctxt/MVC_RoseWindow.md` §2–§3
- **Requirements:** FR-4.10, FR-5.10, FR-5.11, FR-6.5, FR-8.2, NFR-2.2

### MANDATORY: Sandwich Requirement
- **Start:** Criterion comment first; events are published by a **stub model** in the test, not by `Game` (isolation).
- **End:** 100 % pass; golden master unchanged; class count **31**.

### 1. Capability Specification
Adds the event suite. No production change.

### 2. Implementation Instructions
Fixture defined above the tests (a test double, not production code):
```typescript
class StubModel extends AbstractModel<GameEvent> {
  publish(event: GameEvent): void { this.notifyChanged(event) }
}
const P = { row: 0, col: 1 } as const
const DIE = () => new Die('blue', 2)
```

```typescript
/**
 * Test-design criterion: INPUT-DOMAIN PARTITIONING over the event type — one partition per class
 * (7) — each checked for: kind literal, payload, base class, immutability, toData().
 * Cases:
 *  K1 it.each over the 7 classes: instanceof ModelEvent and kind is
 *     diePlaced | placementRejected | draftPoolRefreshed | beamTraced | roundScored | roundForfeited | gameOver
 *  D1 DiePlacedEvent.toData()  -> { kind:'diePlaced', position:{row:0,col:1}, die:{color:'blue',value:2} }
 *  D2 PlacementRejectedEvent with adjacencyViolation offendingNeighbors [(0,0)] -> payload kept verbatim
 *  D3 DraftPoolRefreshedEvent copies dice: mutating the source array leaves event.dice length 5
 *  D4 BeamTracedEvent.toData().path equals path.toData() (directions as names)
 *  D5 RoundScoredEvent(round 7, delta 53) -> { kind:'roundScored', round:7, delta:53 }
 *  D6 RoundForfeitedEvent(round 3) -> { kind:'roundForfeited', round:3 }
 *  D7 GameOverEvent carries the ScoreReport instance (toBe), toData().report deep-equals it
 *  S1 event.source is the publishing model (toBe(stub))
 *  S2 Object.keys(event) does not contain 'source'
 *  S3 two events with equal payload but different sources are toEqual
 *  F1 every event is frozen (it.each over the 7)
 *  N1 notifyChanged delivers the same instance: listener receives e where e === published
 *  N2 a listener narrowing on kind reads payload without casts (compile-time check, run once)
 * Error kinds: none (event classes raise no exception).
 */
```

**JUnit-style rules (MANDATORY):**
- New `StubModel` and new payload objects per test (`beforeEach`).
- No control flow inside tests — use `it.each` with factory functions, e.g.
```typescript
const FACTORIES = [
  ['diePlaced', (m: StubModel) => new DiePlacedEvent(m, P, DIE())],
  ['roundScored', (m: StubModel) => new RoundScoredEvent(m, 7, 53)],
  // … all seven
] as const
it.each(FACTORIES)('K1 %s is a frozen ModelEvent with its kind', (kind, make) => {
  const event = make(new StubModel())
  expect(event).toBeInstanceOf(ModelEvent)
  expect(event.kind).toBe(kind)
})
```
- Expected `toData()` values are literal objects in the file.
- N1 records into an array via `{ modelChanged: e => received.push(e) }` and asserts `expect(received[0]).toBe(event)`.

### 3. Verification Protocol
```bash
pnpm vitest run tests/model/events.test.ts
pnpm typecheck && pnpm lint && pnpm test
git add tests/model && git commit -m "test(model): inc 46 model event tests" && git tag inc-46-green
```
- [ ] Criterion comment present; ≥ 13 tests plus `it.each` rows; 100 % pass
- [ ] All seven `kind` strings asserted literally
- [ ] No control flow inside tests
- [ ] Golden master 5,5,31,16,2,7,53,37 / 156; `check:classes` ≥ 31; lint 0/0

---

**CRITICAL: The seven events keep their kinds and payloads, exclude `source` from equality and reach listeners as the same instance; golden master 5,5,31,16,2,7,53,37 / 156.**
