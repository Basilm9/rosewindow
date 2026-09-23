# Rose Window: lead & light

A portrait mobile game, not a website. The app boots straight into play: a link's run, else the run you left, else a fresh window (first launch starts the guided tutorial on seed 3). There is no landing page, navigation bar, or collection screen.

- **Material:** every surface is glass set in lead came: thick dark outlines, a metallic top highlight, and jewel fills. The only warm light is the beam.
- **Palette:** ink `#140c22`, lead `#0a0612`, parchment `#fbf0dc`, gold `#ffc94a`; glass ruby `#ff3d64`, amber `#ffb21c`, cobalt `#3d7dff`, emerald `#19cf98`, amethyst `#a86cff`.
- **Type:** Grenze Gotisch (banners only: logo, round ribbon, praise, tiers), Big Shoulders Display (every number), Figtree (UI text).
- **Layout (one screen, no scroll):** HUD (pause · score + live multiplier · sound, round pips) → four goal chips with live points → the window in its lead frame, with the entry sun set into the frame → prompt + placements-left pips → dice tray + reroll.
- **Signature moment:** when the beam fires, the room goes dark around the window. Strikes flash white, floats pop "+N ×M", bends spin a ring, the HUD score ticks up and the multiplier badge heats from cream to amethyst. Then the round result slams in ("+34 Brilliant!").
- **Juice inventory:** deal-in tray, lifted and bobbing held die, legal panes breathing in the held die's color, placement slam with ring and sparks, rejection shake and toast, round ribbon, screen shake and glass-shard confetti on big rounds, a sequenced results tally (count-up total, stamped medal, XP bar), synthesized SFX on a pentatonic ladder, and haptics. All motion respects `prefers-reduced-motion`; one switch mutes sound and vibration.
- **Meta kept light:** level and best score on the title card, XP on results, daily window and "New window" in the pause menu, and challenges shared through the Web Share API (clipboard fallback).
- **Rules:** unchanged. The view renders engine state only; live goal points come from the engine's own `calculateScore`.
