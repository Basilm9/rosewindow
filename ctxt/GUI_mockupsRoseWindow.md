# ASCII GUI mockups for Rose Window

Portrait, single screen, no scrolling (360–1920 px wide). Visual language per `docs/overhaul-design.md`: glass set in dark lead came, jewel colors, the beam as the only warm light. Fonts: Grenze Gotisch (banners), Big Shoulders Display (numbers), Figtree (UI text). The SRS figure each screen evidences is given in brackets. Pattern names, objective names and numbers in the mockups are illustrative; the real ones come from `patterns.ts` and `objectives.ts`.

## 1. Setup: choose a window [Figure S-1, FR-1.1, FR-1.2, FR-1.5]

```
┌──────────────────────────────────────┐
│             ROSE WINDOW              │
│          Choose your window          │
│                                      │
│  ┌──────────────┐  ┌──────────────┐  │
│  │ Novice Rose  │  │ Cobalt Spire │  │
│  │ ●●○○ diff.   │  │ ●●●○ diff.   │  │
│  │ ┌──┬──┬──┬──┐│  │ ┌──┬──┬──┬──┐│  │
│  │ │R │  │3 │  ││  │ │  │B │  │5 ││  │
│  │ ├──┼──┼──┼──┤│  │ ├──┼──┼──┼──┤│  │
│  │ │  │  │  │G ││  │ │2 │  │Y │  ││  │
│  │ ├──┼──┼──┼──┤│  │ ├──┼──┼──┼──┤│  │
│  │ │6 │  │  │  ││  │ │  │P │  │  ││  │
│  │ ├──┼──┼──┼──┤│  │ ├──┼──┼──┼──┤│  │
│  │ │  │Y │  │1 ││  │ │R │  │4 │  ││  │
│  │ └──┴──┴──┴──┘│  │ └──┴──┴──┴──┘│  │
│  │ "description"│  │ "description"│  │
│  │  [ Choose ]  │  │  [ Choose ]  │  │
│  └──────────────┘  └──────────────┘  │
│                                      │
│  Seed: [ 3        ]                  │
└──────────────────────────────────────┘
```
Cells show their printed demand: a color letter (R Y B G P), a value (1–6), or blank (open).

## 2. Game screen [Figures S-2, S-3, S-5; FR-2.6, FR-4.13, FR-5.1, FR-7.x, FR-11.8]

```
┌──────────────────────────────────────┐
│ [II]     SCORE 47   ×3       [♪]     │  HUD: pause · beam total + live multiplier · mute
│          ● ● ● ○ ○ ○ ○ ○             │  round pips (round 3 of 8)
├──────────────────────────────────────┤
│ ┌───────┐┌───────┐┌───────┐┌───────┐ │  goal chips with live points;
│ │Rows   ││Color  ││Pairs  ││Only   │ │  tap opens the goal sheet
│ │var. 4 ││diag 2 ││ 6s  0 ││you  9 │ │
│ └───────┘└───────┘└───────┘└───────┘ │
├──────────────────────────────────────┤
│    ☼ ▼   entry sun set in the frame  │  announced entry cell + direction
│  ╔════╦════╦════╦════╗               │
│  ║ R5 ║ ·  ║ ·3 ║ ·  ║               │  placed die: color + numeral
│  ╠════╬════╬════╬════╣               │  · = empty, small print = demand
│  ║ B2 ║░░░░║ ·  ║ ·G ║               │  ░ = legal pane glowing in the
│  ╠════╬════╬════╬════╣               │      held die's color (preview)
│  ║ ·6 ║░░░░║ ·  ║ ·  ║               │
│  ╠════╬════╬════╬════╣               │
│  ║ ·  ║ ·Y ║ ·  ║ ·1 ║               │
│  ╚════╩════╩════╩════╝               │
│   Place a die · placements ◆ ◇       │  prompt + placements left
├──────────────────────────────────────┤
│  [G4] [Y1] [P6] [R2]   (B3 held ↑)   │  dice tray (draft pool); held die lifted
│                       [ ⟲ Recast 1 ] │  recast with remaining count
└──────────────────────────────────────┘
```

## 3. Rejection feedback [Figure S-4, FR-4.11, FR-4.12, NFR-5.1]

```
  ╔════╦════╗
  ║ R5 ║▓R2▓║ ← attempted pane shakes, red pulse
  ╠════╬════╣
  ║ ⬚B2║    ║ ← offending neighbor outlined (same value 2)
  ╚════╩════╝
  ┌────────────────────────────────────┐
  │ ✕ Side by side can't share a color │  toast near the board, fades by itself
  │   or a number.                     │  (no modal, nothing to dismiss)
  └────────────────────────────────────┘
```

## 4. Beam moment [Figure S-6, FR-5.10]

```
  room darkens around the window
  ☼──►[R5]─┐            +5 ×1   strike flashes white
           │ ring spin          bend spins a ring
           ▼
         [B2]──►[P3]──► exits   +6 ×2   +9 ×3   floats pop "+N ×M"
  HUD score ticks up; multiplier badge heats cream → amethyst
  then:   ┌──────────────────┐
          │  +34  Brilliant! │   round result slams in
          └──────────────────┘
```

## 5. Pause menu [FR-17.1, FR-15.4]

```
┌──────────────────────────────────────┐
│               PAUSED            [✕]  │
│  Level 4 · Best 128                  │
│  [ Resume              ]             │
│  [ How to play         ]             │
│  [ Daily window        ]             │
│  [ New window          ]             │
│  [ Challenge a friend  ]             │
└──────────────────────────────────────┘
```

## 6. How to play sheet [FR-9.4]

```
┌──────────────────────────────────────┐
│ How to play                     [✕]  │
│ 1 · Build the window                 │
│   Tap a die, then tap a glowing pane.│
│   Each round you place 2 of the 5.   │
│   Your first die goes on the edge.   │
│   Every new die must touch one       │
│   already placed, even at a corner.  │
│   Side by side can't share a color   │
│   or a number. Printed panes only    │
│   take their color or number.        │
│ 2 · Bend the light                   │
│   R Y turn right · B G turn left ·   │
│   P straight on. After turning on N, │
│   straight for N−1 panes.            │
│ 3 · Score   number × multiplier;     │
│   each turn +1, up to ×5.            │
│ 4 · Finish strong  goals pay at end. │
└──────────────────────────────────────┘
```

## 7. Results [Figure S-7, FR-8.2 to FR-8.5, FR-13.2, FR-13.3, FR-13.6]

```
┌──────────────────────────────────────┐
│            WINDOW COMPLETE           │
│   ┌──finished window (small)──┐      │
│   └───────────────────────────┘      │
│   Row color variety ........  12     │
│   Color diagonals ..........   6     │
│   Pairs of sixes ...........   4     │
│   Only you (purple) ........  14     │
│   Beam total ...............  56     │
│   ─────────────────────────────      │
│   Total                       92     │  count-up
│            ( GOLD )                  │  stamped medal
│   ★ New best!   Achievement: …       │
│   XP ▓▓▓▓▓▓▓░░░  Level 4 → 5         │
│   [ New window ] [ Daily ] [ Share ] │
└──────────────────────────────────────┘
```

## 8. Guided introduction [Figure S-8, FR-9.1 to FR-9.3]

```
  ┌───────────────────────────────┐
  │ Step 2 of 6 · Place           │  coach-mark card over the board;
  │ Tap a glowing pane to set the │  advances when the player does
  │ die in the window.            │  the action, not on a button
  │                    [ Skip ]   │
  └───────────────────────────────┘
```

## 9. Forfeited round [FR-6.5]

```
  ┌───────────────────────────────────┐
  │ No legal move: round 5 forfeited. │
  │ The beam still lights the window. │
  └───────────────────────────────────┘
```
