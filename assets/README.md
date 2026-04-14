# Uno No Mercy — Asset Matching

## What's here

- `no_mercy_cards.json` — canonical list of every unique Uno No Mercy card type (66 entries).
- `cards/` — every scanned jpg from `../../unoImage/` copied flat, with a `pN_` prefix showing source page (so `p1_yellow_+2_a.jpg` came from `unoImage/1/yellow_+2_a.jpg`). 72 files.

## Your job

For each entry in `no_mercy_cards.json`:

1. **Find the matching scan** in `cards/` and set the `source` field to its filename (e.g. `"source": "p1_yellow_+2_a.jpg"`).
2. **Rename the file** in `cards/` to match the canonical `name` field (e.g. `cards/p1_yellow_+2_a.jpg` → `cards/red_+6.jpg` if that's what it actually is).
3. If the physical deck doesn't have a card listed in the JSON, set `"exists": false`.
4. If a scan doesn't match anything in the JSON, **add a new entry** at the bottom of the `cards` array with a clear description.

## Ambiguities I flagged (worth eyeballing first)

- **Colored +4 vs +6**: what I labelled `*_+4_*` might actually be colored `+6` cards (No Mercy has colored draw-6 cards; a colored `+4` exists too, distinct from Wild +4).
- **Reverse vs. swap/etc.**: two different arrow iconographies showed up; some decks use them for different cards.
- **Page 16/17 cartoon-character cards**: I called these `wild_swap` — they might be `wild_discard_color`, `wild_skip_everyone`, or something else.

## When you're done

Ping me — I'll wire the renamed `cards/` directly into the game's `public/cards/` and use the JSON as the deck catalog for the server-side engine.
