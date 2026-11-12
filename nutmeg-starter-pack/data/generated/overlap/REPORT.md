# The Overlap coverage report

Generated from the checked-in FC 27 prototype catalogue and Paper Trail senior-club snapshot dated 2026-11-11.

| Coverage | Count |
|---|---:|
| Eligible players with verified Paper Trail history | 87 |
| Unique canonical clubs in those histories | 163 |
| National-team countries represented | 28 |
| Verified player–club relationships | 314 |
| Club A + Club B + country combinations with a 3/3 player | 465 |
| Approved combinations with a separate 2/3 alternative | 156 |
| Excluded combinations without a useful 2/3 alternative | 309 |

## Method

Every unordered pair of distinct canonical Wikidata club IDs in an eligible player’s verified senior history is combined with that player’s authoritative `nationalTeam` value. The full searchable catalogue is then evaluated against those canonical IDs. A combination is approved only when at least one player matches all three conditions and a different player matches exactly two.

No club membership is inferred from display-name similarity. Duplicate spells at the same canonical club count once. Players without a verified Paper Trail history remain searchable but cannot receive a historical-club match; they may still match the country condition.

## Exclusions and limitations

- 309 otherwise valid 3/3 combinations are excluded because the current small catalogue provides no separate 2/3 alternative.
- No ambiguous club identifiers are admitted: the generator requires Paper Trail’s canonical Wikidata club ID.
- The prototype uses the existing single national-team field and does not infer dual-nationality eligibility.
- Wikidata club histories are marked `editorial_review_required`; this report does not claim complete career coverage.
- The source catalogue’s redistribution licence and calendar-2026 appearance eligibility remain under review.
