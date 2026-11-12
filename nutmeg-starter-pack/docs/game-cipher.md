# The Cipher — Cold Cases practice and daily ranked case

The Cipher presents the normalized letters of one footballing name in a shuffled order. Cold Cases hides the letters behind an **Open the File** gate and gives the player 20 seconds plus four distinct attempts to restore the name. Practice is browser-local; the untimed daily case stores its shared puzzle, attempts, optional evidence and score in D1 and validates every action in the Worker.

## Evidence and scoring

- Base successful scores are 100, 75, 50 and 25 points by attempt. Failure scores zero.
- Nation evidence becomes available after two incorrect attempts. Club evidence becomes available after three.
- Availability does not reveal a hint. The player must explicitly unseal it, and each opened hint deducts ten points.
- Ranked hint state is persisted as a server-side bitmask. The Worker enforces thresholds and calculates the final deduction; the frontend cannot submit its own score.
- A failed result uses the peach/red failure treatment rather than the lime success stamp.

Both modes normalize accents and selected football-name characters consistently. The daily answer remains hidden until the attempt reaches a terminal state.
