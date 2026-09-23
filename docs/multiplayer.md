# Friend challenges and the path to ranked play

Rose Window currently supports asynchronous friend challenges. A finished run can be shared as a link or a portable `RW1` code. The recipient gets the same unsigned 32-bit seed, the same fixed window pattern, and a target score. Default game configuration, objectives, draft sequence, beam entry sequence, and all rule constants are shared. The receiving UI must select the supplied pattern instead of offering another choice.

Scores on these links are **self-reported**. There is no server, matchmaking, public leaderboard, opponent presence, or claim that a rival is online. Codes include a checksum to catch accidental edits; it is not a signature and does not prevent intentional edits. A localhost link is useful only on the hosting device; deploy to an accessible origin before sharing links between devices. Portable codes can be exchanged and entered on any installation with the same ruleset.

The daily window changes at 00:00 UTC. Every device derives its seed from the UTC date and uses that seed's first offered pattern. Free-play seeds remain independent. Daily progress and earned cosmetics live in the browser's local storage. Clearing that storage removes progress. Clock edits and local save edits are outside the trust boundary of these local features.

## Implemented contract

`src/progression/challenges.ts` defines `FriendChallenge` with `version`, `ruleset`, `seed`, `patternId`, and `targetScore`. Decoder validation rejects unsupported versions, invalid seed/score ranges, noncanonical encodings, checksum mismatches, and patterns not offered by the seed. `CHALLENGE_RULESET` must be incremented when changes affect seeded generation or scoring. Preserve old ruleset implementations if old links should remain playable.

Run rewards are recorded by stable run ID. Keep the same ID throughout a run and use its actual completion timestamp. Do not award unfinished runs or developer fast-forward previews. Calling `recordRun` repeatedly with the same ID grants no extra XP, shards, quests, or achievements; its ID ledger is retained even when the visible 30-run history rolls over. Replaying a window is a new run and may earn ordinary run rewards. Daily gifts, quests, achievements, and purchased cosmetics grant once under their respective IDs.

## Next step: verified asynchronous competition

1. Add authenticated accounts and a server-side challenge record containing an immutable ruleset version, canonical configuration, seed, pattern, expiry, and challenge ID. Use the server's UTC date for ranked daily windows.
2. Capture a compact action log: draft selection by stable die/pool identity, legal board placement, and eligible round forfeits. Store an ordinal for every action. Never accept client score totals as authoritative.
3. Reconstruct the seeded game on the server and replay every action through the pure engine. Reject illegal actions, wrong pattern/configuration, incomplete games, duplicate submission IDs, and a ruleset mismatch. Calculate the final score on the server.
4. Store immutable verified results with account, challenge, action-log digest, and final score. Make submissions idempotent and enforce one chosen leaderboard policy: first completion, best completion, or a fixed attempt allowance. Show that policy before play.
5. Build friend invitations and per-challenge comparisons from verified results. Only then add public ranking, matchmaking, cloud progression, and abuse controls. Realtime play can use the same verified challenge/session protocol if research shows it improves this turn-based puzzle.

Use an ordinary tie result when final scores match. Do not favor speed by default: the existing puzzle rewards planning. Cosmetics must continue to leave dice distributions, scoring, and play access unchanged.
