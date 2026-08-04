# Smell Report — Command Code Status

**Project:** Command Code Status (status.commandcode.ai)
**Mode:** smell
**Date:** 2026-07-16
**Surface:** Live status page — nav, header, Live Status (time selector + site cards with response-time graphs), Active Incidents, Scheduled Maintenance, Past Incidents, footer.

## Score

**9/10 — FAINT**

One tell detected: generic tech hue. The surface is largely authored. The schematic aesthetic (zero radius, dashed bordered column, corner-box seam markers, monospace `//` section labels) is a specific point of view, not a template reflex. The rot is concentrated in one place: the identity accent color.

## Heuristic Scores

| # | Odor | Status | Evidence |
|---|---|---|---|
| 1 | Tech gradient | CLEAN | No gradients anywhere. Solid black canvas, flat card fills, no gradient text or buttons. |
| 2 | Generic tech hue | DETECTED | Identity accent is `#8c4edd` (violet) in dark/night, `#2e1b9c` (indigo) in light, `#546bf3` (blue) in ocean. Purple/violet is the default "AI startup" hue. The Command Code logo is pure black and white, so purple is a reflex, not brand. No domain reason for purple on a status monitor. |
| 3 | Feature tile grid | CLEAN | Site cards are a status list with per-site graphs and uptime data, not a uniform icon-heading-sentence grid. Incidents are a dated feed. |
| 4 | Accent rail | CLEAN | The 4px colored left border on status cards conveys up/down/degraded state. It is real organization, not decoration pretending to be structure. Border treatment is the recommended differentiation, not the smell. |
| 5 | Unearned blur | CLEAN | No backdrop-filter, no frosted glass. Depth is handled with borders and flat fills consistent with the schematic aesthetic. |
| 6 | Stat monument | CLEAN | Uptime percentages are inline data spans inside cards, not oversized number clusters filling a section. |
| 7 | Icon topper | CLEAN | Section headings use a text `//` prefix (code-comment metaphor), not rounded-square icons stacked above headings. Site icons sit inline next to names, functional. |
| 8 | Bounce everywhere | CLEAN | Transitions use plain `ease` at 0.15s/0.3s. Loading uses a steady rotation. No elastic or bounce easing. |
| 9 | Default type | CLEAN | System mono is used with clear voice and reason: section labels, data values, tags, time selector. System sans is legitimate for this product register. The mono/sans pairing is a deliberate technical-readout decision. |
| 10 | Center stack | CLEAN | Nav is space-between (logo left, links right). Main content is left-aligned. Only the footer lockup is centered, which is correct for a centered wordmark. |

## Domain Default Trap

**Partially present.** A developer tool rendered as dark canvas with monospace labels is the domain default — "a developer tool as dark with terminal mono." The substrate (dark + mono) is predictable from the industry alone.

However, the execution elevates it: the bordered column with registration-mark corner boxes, dashed seam borders, zero radius, and `//` comment-prefix headings are authored art direction that does not come from a template. The one dimension still sitting on the default is **color** — the purple accent. Removing it and committing to a monochrome accent (matching the black/white brand mark) breaks the domain default in the color dimension and lets the functional status colors become the only chroma on the page.

## What's Working

- The schematic composition (corner boxes, dashed borders, zero radius) is a strong, specific art direction that could only belong to a technical status surface.
- Monospace `//` section labels give the page a voice without decoration.
- Functional status color is correct and restrained: green/amber/red carry meaning, nothing else competes.
- Flat, border-based depth is consistent with the aesthetic — no unearned glass or shadow.

## Priority Issues

### P1 — Generic tech hue (identity accent is violet)

**Evidence:** `--nav-current-border-bottom-color: #8c4edd` (dark), `#2e1b9c` (light), `#8c4edd` (night), `#546bf3` (ocean). This variable drives the nav current-page indicator, hover states, focus rings, card hover borders, and the selected time-range button. It is the interactive identity color. Violet/indigo is the reflexive "AI/tech" choice and has no relationship to status monitoring. The brand mark is monochrome.

**Reflex:** Reach for purple when the product is software-adjacent, with no project-level justification.

**Fix mode:** deslop → recolor. Replace the identity accent with a monochrome value tied to the black/white brand. Let status colors be the only chroma. This makes the status colors more meaningful and removes the one generic tell.

### P2 — Domain default substrate (dark + mono)

**Evidence:** Dark canvas + monospace labels is the expected developer-tool default.

**Fix mode:** Already partially broken by the schematic composition. Completing the monochrome accent fully resolves the color dimension. No further composition change needed.

## Next Modes

- `/design deslop` — apply the fixes above (remove the generic tech hue, commit to monochrome accent).
