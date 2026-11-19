# GUI mockups for Rose Window

**The screenshots in `mockups/` are the authoritative mockups.** They were captured from the running reference build, in portrait at phone width, and show the layout, spacing, colors and wording the view must keep. The ASCII sketches below each one are a quick text summary of the same screen; where a sketch and its screenshot disagree, the screenshot wins.

Portrait, single screen, no scrolling (360–1920 px wide). Visual language per `docs/overhaul-design.md`: glass set in dark lead came, jewel colors, the beam as the only warm light. Fonts: Grenze Gotisch (banners), Big Shoulders Display (numbers), Figtree (UI text). The SRS figure or requirement each screen evidences is given in brackets. Pattern names, objective names, seeds and numbers vary by run; the real ones come from `patterns.ts` and `objectives.ts`.

| # | Screenshot | Screen |
| --- | --- | --- |
| 1 | `mockups/01-setup.png` | Setup: choose a window |
| 2 | `mockups/02-board-round1.png` | Game screen at the start of a run |
| 3 | `mockups/03-legal-preview.png` | Holding a die: legal panes glow |
| 4 | `mockups/04-placement-rejected.png` | Holding a die over a pane it cannot take |
| 5 | `mockups/05-beam.png` | Beam moment |
| 6 | `mockups/06-goal-sheet.png` | Goal sheet |
| 7 | `mockups/07-pause-menu.png` | Pause menu |
| 8 | `mockups/08-round-forfeit.png` | Forfeited round |
| 9 | `mockups/09-final-report.png` | Results |
| 10 | `mockups/10-tutorial.png` | Guided introduction |
| 11 | `mockups/11-challenge-share.png` | Challenge link copied |
| 12 | `mockups/12-pause-abandon-confirm.png` | Pause menu: confirm abandoning the run |

## 1. Setup: choose a window [Figure S-1, FR-1.1, FR-1.2, FR-1.5]

See `mockups/01-setup.png`.

```
┌──────────────────────────────────────┐
│                                 [?]  │  how to play
│             ROSE WINDOW              │
│        [✦ Level 5] [🏆 Best 184]      │  profile chips
│            Pick a window             │
│  ┌──────────────┐  ┌──────────────┐  │
│  │ ┌──┬──┬──┬──┐│  │ ┌──┬──┬──┬──┐│  │  two offered patterns; tap a card
│  │ │R │  │2 │Y ││  │ │B │  │  │P ││  │  to choose it
│  │ ├──┼──┼──┼──┤│  │ ├──┼──┼──┼──┤│  │
│  │ │  │5 │  │P ││  │ │  │  │4 │  ││  │
│  │ ├──┼──┼──┼──┤│  │ ├──┼──┼──┼──┤│  │
│  │ │P │  │4 │  ││  │ │  │2 │  │  ││  │
│  │ ├──┼──┼──┼──┤│  │ ├──┼──┼──┼──┤│  │
│  │ │B │3 │  │G ││  │ │G │  │  │R ││  │
│  │ └──┴──┴──┴──┘│  │ └──┴──┴──┴──┘│  │
│  │   Tracery    │  │    Lancet    │  │
│  │    ◆◆◆       │  │    ◆◆◇       │  │  difficulty gems
│  │ "description"│  │ "description"│  │  hidden at very narrow widths
│  └──────────────┘  └──────────────┘  │
│           Window #3303326032         │  seed in effect
└──────────────────────────────────────┘
```
Cells show their printed demand: a color (gem icon), a value (1–6), or blank (open). There is no seed field: a seed is supplied in the link (`?seed=3`) and shown as "Window #N".

## 2. Game screen [Figures S-2, S-3, S-5; FR-2.6, FR-4.13, FR-5.1, FR-7.x, FR-11.8]

See `mockups/02-board-round1.png` (start of round 1) and `mockups/03-legal-preview.png` (a die held: every legal pane glows in the held die's color; hovering shows the pane's demand, e.g. "requires green glass").

```
┌──────────────────────────────────────┐
│ [II]           0              [♪]    │  HUD: pause · beam total · mute
│          ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢             │  round pips; completed rounds show
│             ROUND 1/8                │  their score
├──────────────────────────────────────┤
│ ┌───────┐┌───────┐┌───────┐┌───────┐ │  goal chips with live points;
│ │Odd  0 ││Even 0 ││Row  0 ││Red  0 │ │  tap opens the goal sheet
│ └───────┘└───────┘└───────┘└───────┘ │
├──────────────────────────────────────┤
│  ╔════╦════╦════╦════╗               │
│  ║ ◆B ║    ║    ║ ◆P ║               │  printed demands: gem = color,
│  ╠════╬════╬════╬════╣               │  faint numeral = value
│  ║    ║    ║ 4  ║    ║  ◀ (entry)    │  announced entry: sun badge on the
│  ╠════╬════╬════╬════╣               │  frame, arrow = direction of travel
│  ║    ║ 2  ║    ║    ║               │
│  ╠════╬════╬════╬════╣               │
│  ║ ◆G ║    ║    ║ ◆R ║               │
│  ╚════╩════╩════╩════╝               │
│  Pick your glass              ◆ ◆    │  prompt + placements left
├──────────────────────────────────────┤
│  [Y1] [G2] [G6] [P1] [Y3]   (⟲ 1)    │  draft tray; small icon on each die
└──────────────────────────────────────┘  = its turn; recast with count badge
```

## 3. Holding a die over a pane it cannot take [Figure S-3, FR-4.11 to FR-4.13, NFR-5.1]

See `mockups/04-placement-rejected.png`: the held die hovers over a pane whose demand it does not meet; that pane stays dark while legal panes glow, and the hint names the demand ("requires red glass").

A tap on an illegal pane is rejected without a modal: the attempted pane shakes with a red pulse, any offending neighbor is outlined, and a toast near the board names the broken law and fades by itself.

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

See `mockups/05-beam.png`: the room darkens, the beam runs from the entry badge across the window, each struck die flashes and floats "+N"; the draft tray dims with "The beam scores the window…".

```
  ☼──►[R5]─┐            +5 ×1   strike flashes white
           │                    bend spins a ring
           ▼
         [B2]──►[P3]──► exits   +6 ×2   +9 ×3   floats pop "+N ×M"
  HUD score ticks up; multiplier badge appears beside it
```

## 5. Goal sheet [Figure S-2, FR-2.3, FR-2.6]

See `mockups/06-goal-sheet.png`: a bottom sheet over the dimmed board, opened from any goal chip.

```
┌──────────────────────────────────────┐
│                Goals            [✕]  │
│ These pay out when the window is     │
│ finished. Points shown are what      │
│ you'd get right now.                 │
│ [⚀] Odd Values                  +1   │  name, scoring rule, live points
│ [⚁] Even Values                 +1   │
│ [▦] Row Color Variety           +0   │
│ [♦] Patron of Red (Only you)    +0   │  private objective tagged "Only you"
└──────────────────────────────────────┘
```

## 6. Pause menu [FR-7.1, FR-17.1, FR-15.4]

See `mockups/07-pause-menu.png`: a bottom sheet over the blurred board.

```
┌──────────────────────────────────────┐
│               Paused            [✕]  │  tapping outside also resumes
│  [ ▷ Resume                ]         │
│  [ ? How to play           ]         │
│  [ ▦ Today's daily window  ]         │
│  [ ⟲ New window            ]         │
│   Free play · Lancet · window #N     │  mode · pattern name · seed
└──────────────────────────────────────┘
```

## 7. Pause menu: confirm abandoning the run [FR-17.1]

See `mockups/12-pause-abandon-confirm.png`: the first tap on "New window" turns it into a red confirmation; a second tap abandons the run.

```
│  [ ⟲ Tap again to abandon this window ]   (red)
```

## 8. How to play sheet [FR-9.4]

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

## 9. Results [Figure S-7, FR-8.2 to FR-8.5, FR-13.2, FR-13.3, FR-13.6, FR-16.1]

See `mockups/09-final-report.png`.

```
┌──────────────────────────────────────┐
│           Lancet complete            │
│        (finished window, small)      │
│   Beam ......................  +87   │  beam total first,
│   Odd Values ................   +6   │  then one line per objective
│   Even Values ...............   +7   │
│   Row Color Variety .........   +5   │
│   Patron of Red .............   +6   │
│  ┌──────────────────────────────┐    │
│  │ Total  111           (GOLD)  │    │  grand total + tier medal
│  └──────────────────────────────┘    │
│   Level 5  ▓▓▓▓▓▓░░░░      +105 XP   │
│   Unlocked: Glass artist             │  achievement named when earned
│   [ ▷ Play again                ]    │
│   [ ⇪ Challenge ]  [ ▦ Daily    ]    │
└──────────────────────────────────────┘
```

## 10. Challenge link copied [FR-16.1, FR-16.2, FR-16.7]

See `mockups/11-challenge-share.png`: after "Challenge", a toast confirms "Challenge link copied. Send it to a friend." (the device share sheet is used instead where one exists).

## 11. Guided introduction [Figure S-8, FR-9.1 to FR-9.3]

See `mockups/10-tutorial.png`: a coach-mark card at the top of the screen.

```
  ┌────────────────────────────────────┐
  │ 2/6  Draft a die             Skip  │  advances when the player does
  │ Tap any die in your tray to lift it│  the action, not on a button
  └────────────────────────────────────┘
```

## 12. Forfeited round [FR-6.5]

See `mockups/08-round-forfeit.png`: a banner under the HUD while the beam still runs.

```
  ┌────────────────────────────────────────────┐
  │ No die fit anywhere in round 7.            │
  │ The beam still scores.                     │
  └────────────────────────────────────────────┘
```
