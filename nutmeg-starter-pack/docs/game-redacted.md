# Redacted — Cold Cases practice

Redacted is a browser-only football name game presented as a confidential case file. Its evidence stays sealed until **Open the File** starts a monotonic 20-second practice clock. It uses the existing 96-player FC 27 prototype catalogue and never requests a detective identity, calls the Worker, writes to D1 or contributes to the weekly table.

## Rules

- A random eligible player is chosen, excluding the immediately previous Redacted answer in the browser session.
- The case displays a recognizable surname or footballing name containing 4–12 alphabetic characters.
- Correct letters reveal every matching position. Diacritics and selected football-name characters are normalized, so `MBAPPE` solves `MBAPPÉ` and `ODEGAARD` matches `ØDEGAARD`.
- Spaces, punctuation and word boundaries remain visible. Duplicate letter submissions are disabled.
- Six incorrect letter or full-player guesses close the case.
- Letting the 20-second practice clock expire also closes the case at zero points.
- The optional **Name the Suspect** search accepts the canonical player ID; an incorrect full-player guess consumes one strike and cannot be repeated.
- Evidence 01 becomes available after two strikes and Evidence 02 after four. Opening evidence is voluntary and deducts ten points.
- Successful cases start at 100 points, lose 12 per strike and 10 per opened evidence card, with a minimum successful score of 10. Failed cases score zero.

## Local records

Versioned, defensively parsed local storage tracks games played, wins, total wrong guesses on wins, best score and current win streak. These records are deliberately non-authoritative and never leave the browser.

## Data status

Nationality, position, club and FC overall evidence comes directly from the current prototype player record. The catalogue’s source-licence and 2026 eligibility reviews remain pending, matching the rest of Cold Cases.
