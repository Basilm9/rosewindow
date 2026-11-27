import Mathlib

/-!
# Rose Window — the beam loop always stops (NFR-6.2)

A model of `trace` in `src/model/BeamTracer.ts` (prompt 35), checked by Lean 4.

* Precondition P: n × n grid, every cell empty or one die (colour, value 1..6),
  entry on an edge pointing inward, cap ≥ 1.
* Loop invariant I (at every loop check): `pos` inside the grid; 1 ≤ m ≤ cap; 0 ≤ lock ≤ 5;
  `visited` = the (cell, direction) pairs of the recorded segments plus the current one,
  all different.
* Termination (textbook 8.19): W = ℕ, f = |all (cell, direction) pairs| − |visited|.
  Every pass that continues adds one NEW pair to `visited`, so f strictly decreases and
  stays in ℕ. Lean only accepts `go` below because it can prove exactly that
  (`termination_by` + `decreasing_by`); with no cycle guard the definition is rejected.
-/

namespace RoseWindow

inductive Dir | north | east | south | west
  deriving DecidableEq, Repr

/-- The four directions form a finite type (written out by hand). -/
instance : Fintype Dir where
  elems := {.north, .east, .south, .west}
  complete := by intro d; cases d <;> simp

inductive Color | red | yellow | blue | green | purple
  deriving DecidableEq, Repr

structure Die where
  color : Color
  value : Nat
  deriving DecidableEq, Repr

def Dir.cw : Dir → Dir
  | .north => .east | .east => .south | .south => .west | .west => .north

def Dir.ccw : Dir → Dir
  | .north => .west | .west => .south | .south => .east | .east => .north

/-- Refraction (FR-5.4): red/yellow clockwise, blue/green counter-clockwise, purple straight. -/
def turnDir : Color → Dir → Dir
  | .red, d | .yellow, d => d.cw
  | .blue, d | .green, d => d.ccw
  | .purple, d => d

variable {n : Nat}

/-- One cell further in direction `d`, or `none` when that leaves the n × n grid (FR-5.8). -/
def step (p : Fin n × Fin n) : Dir → Option (Fin n × Fin n)
  | .north => if 0 < p.1.val then some (⟨p.1.val - 1, by have := p.1.isLt; omega⟩, p.2) else none
  | .south => if h : p.1.val + 1 < n then some (⟨p.1.val + 1, h⟩, p.2) else none
  | .west  => if 0 < p.2.val then some (p.1, ⟨p.2.val - 1, by have := p.2.isLt; omega⟩) else none
  | .east  => if h : p.2.val + 1 < n then some (p.1, ⟨p.2.val + 1, h⟩) else none

/-- One cell the beam entered: where, heading which way, the die there, the multiplier, the points. -/
structure Segment (n : Nat) where
  pos : Fin n × Fin n
  dir : Dir
  die : Option Die
  mult : Nat
  points : Nat
  deriving Repr

inductive Ending | exitedGrid | cycle
  deriving DecidableEq, Repr

/-- A (cell, direction) pair. There are exactly n · n · 4 of them. -/
abbrev Pair (n : Nat) := (Fin n × Fin n) × Dir

/-- The termination step: adding a pair that was not already in `s` makes
    |all pairs| − |s| strictly smaller, and it stays a natural number. -/
theorem measure_lt {α : Type} [Fintype α] [DecidableEq α] {s : Finset α} {a : α}
    (h : a ∉ s) : Fintype.card α - (insert a s).card < Fintype.card α - s.card := by
  have h1 : s.card < (insert a s).card := Finset.card_lt_card (Finset.ssubset_insert h)
  have h2 : (insert a s).card ≤ Fintype.card α := Finset.card_le_univ _
  omega

/-- The loop body, in the order of BeamTracer.ts: score first, then bend or spend lockout,
    then step; stop on leaving the grid or on a repeated (cell, direction). -/
def go (grid : Fin n × Fin n → Option Die) (cap : Nat)
    (pos : Fin n × Fin n) (dir : Dir) (m lock : Nat)
    (visited : Finset (Pair n)) : List (Segment n) × Ending :=
  let die := grid pos
  let seg : Segment n := ⟨pos, dir, die, m, ((die.map Die.value).getD 0) * m⟩
  let next3 : Dir × Nat × Nat :=
    match die with
    | some d =>
      if lock = 0 ∧ d.color ≠ .purple then (turnDir d.color dir, min (m + 1) cap, d.value - 1)
      else (dir, m, lock - 1)
    | none => (dir, m, lock - 1)
  match step pos next3.1 with
  | none => ([seg], .exitedGrid)
  | some nxt =>
    if _h : (nxt, next3.1) ∈ visited then ([seg], .cycle)
    else
      let rest := go grid cap nxt next3.1 next3.2.1 next3.2.2 (insert (nxt, next3.1) visited)
      (seg :: rest.1, rest.2)
termination_by Fintype.card (Pair n) - visited.card
decreasing_by exact measure_lt (by assumption)

/-- `trace`: start at the entry with multiplier 1, no lockout, the entry pair visited. -/
def trace (grid : Fin n × Fin n → Option Die) (cap : Nat) (pos : Fin n × Fin n) (dir : Dir) :
    List (Segment n) × Ending :=
  go grid cap pos dir 1 0 {(pos, dir)}

/-! ## Invariant pieces: one pass of the body keeps them true -/

/-- I-2a: a bend keeps 1 ≤ m ≤ cap. -/
theorem mult_bend {m cap : Nat} (h1 : 1 ≤ m) (h2 : m ≤ cap) :
    1 ≤ min (m + 1) cap ∧ min (m + 1) cap ≤ cap := by
  omega

/-- I-2b: a bend sets lockout to value − 1, which is in 0..5 because the value is in 1..6. -/
theorem lock_bend {v : Nat} (h1 : 1 ≤ v) (h2 : v ≤ 6) : v - 1 ≤ 5 := by
  omega

/-- I-2b: spending lockout keeps it in 0..5. -/
theorem lock_spend {lock : Nat} (h : lock ≤ 5) : lock - 1 ≤ 5 := by
  omega

/-- The number of (cell, direction) pairs: the loop runs at most this many passes (64 for 4 × 4). -/
theorem card_dir : Fintype.card Dir = 4 := by decide

theorem card_pairs : Fintype.card (Pair n) = n * n * 4 := by
  simp [Pair, Fintype.card_prod, Fintype.card_fin, card_dir]

/-! ## Cross-checks against the TypeScript tests (prompts 35–36) -/

def cell (c : Color) (v : Nat) : Option Die := some ⟨c, v⟩

/-- Golden walk grid: R1 R3 B5 B5 / B1 B1 B6 P6 / .. P1 Y4 G6 / R6 Y1 G2 Y1 -/
def golden : Fin 4 × Fin 4 → Option Die := fun p =>
  match p.1.val, p.2.val with
  | 0, 0 => cell .red 1    | 0, 1 => cell .red 3    | 0, 2 => cell .blue 5   | 0, 3 => cell .blue 5
  | 1, 0 => cell .blue 1   | 1, 1 => cell .blue 1   | 1, 2 => cell .blue 6   | 1, 3 => cell .purple 6
  | 2, 1 => cell .purple 1 | 2, 2 => cell .yellow 4 | 2, 3 => cell .green 6
  | 3, 0 => cell .red 6    | 3, 1 => cell .yellow 1 | 3, 2 => cell .green 2  | 3, 3 => cell .yellow 1
  | _, _ => none

/-- Orbit grid: R1 R1 / B1 R1 -/
def orbit : Fin 2 × Fin 2 → Option Die := fun p =>
  match p.1.val, p.2.val with
  | 0, 0 => cell .red 1 | 0, 1 => cell .red 1 | 1, 0 => cell .blue 1 | 1, 1 => cell .red 1
  | _, _ => none

def summary {k : Nat} (r : List (Segment k) × Ending) : Nat × Nat × Ending :=
  (r.1.length, (r.1.map (·.points)).sum, r.2)

-- expected (9, 59, cycle)  — test Y1 "golden walk"
#eval summary (trace golden 5 (1, 0) .east)
-- expected (5, 15, exitedGrid)  — test M1 "orbit at cap 5"
#eval summary (trace orbit 5 (1, 0) .east)
-- expected (5, 12, exitedGrid)  — test M2 "orbit at cap 3"
#eval summary (trace orbit 3 (1, 0) .east)

end RoseWindow
