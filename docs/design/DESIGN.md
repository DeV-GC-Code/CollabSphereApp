# CollabSphere — Design System

> ## ⚠️ v2 — "Calm Paper" (Notion-style) is the CURRENT system. This section supersedes everything below it.
>
> The previous "Operator Console" direction (graphite + signal-lime neon) has been **retired**. Sections 1–2 (product/service map, brand position) still hold. Sections 3–10 below describe the *old* visual language and are kept only for history — **where they disagree with this v2 block, this block wins.**

### v2 design language
A calm, warm, document-grade interface in the spirit of Notion: white/warm-paper canvas, charcoal ink, generous whitespace, hairline dividers, and **one** restrained blue for everything interactive. No neon, no glow, no grid texture, no gradient shimmer. Personality comes from the brand orb, typography rhythm, and restraint — not from color noise.

### v2 tokens (authoritative — mirror `collabsphere-ui/src/styles/app.css`)

**Light (default)**

| Token | Value | Role |
|---|---|---|
| `--bg` | `#FFFFFF` | Canvas |
| `--bg-2` | `#F7F6F3` | Warm paper — rail, wells, hover base |
| `--surface` | `#FFFFFF` | Panels |
| `--surface-soft` | `rgba(55,53,47,.05)` | Hover gray |
| `--text` | `#37352F` | Warm charcoal ink |
| `--text-soft` | `#6B6A65` | Secondary |
| `--text-muted` | `#9B9A97` | Meta |
| `--accent` | `#2383E2` | Interactive fill (Notion blue) |
| `--accent-ink` | `#1A6DC2` | Links / accent text (AA on white) |
| `--ember` | `#D9482F` | Brand red (orb, likes) — sparingly |
| `--outline` | `rgba(55,53,47,.10)` | Hairline |
| `--success/danger/warning` | `#2E7D52 / #D44C47 / #CB7E2F` | Muted status |

**Dark** — charcoal, not graphite: `--bg #191919`, `--bg-2 #202020`, `--surface #1F1F1F`, `--text #E6E6E4`, `--accent #2F8FEA`, `--accent-ink #6FB3F2`, `--ember #E2624A`. Same calm-blue system, lightened for contrast.

**Geometry / depth:** radii `5 / 8 / 10 / 14px`; depth from hairlines + soft popover shadows (`--shadow-md/-xl`), never glow. **Type:** `Inter` for UI + display (hierarchy via weight, 400→700), `JetBrains Mono` for data/meta only. **Color is never the only signal** (pair with icon/label/shape). WCAG 2.1 AA unchanged.

### Brand mark
One mark everywhere: the **orb** — a warm red planet wrapped by a tilted blue ring on a cream tile (`public/icon.svg`, favicon, `BrandMark`, `BrandOrb`). No competing logos.

### v2 pre-ship checklist
- [ ] Zero neon: `grep -iE 'C6F24E|EC5A2E|F07A4E|rgba\(236, ?90, ?46|rgba\(198, ?242, ?78' app.css` → empty.
- [ ] Inter on UI/headings; JetBrains Mono on meta only; no Geist/Fraunces/Jakarta/Space Grotesk.
- [ ] One blue accent for all interaction; no gradients/glow/grid texture.
- [ ] Buttons: solid-blue primary, surface+hairline secondary; icon+label vertically centered, 16px icons, consistent height.
- [ ] Light & dark both pass AA; hairlines visible in both.
- [ ] Orb icon used as favicon + brand mark everywhere.

---

<details>
<summary><em>History — v1 "Operator Console" (retired). Kept for reference only.</em></summary>

> **"Operator Console."**
> A community platform rendered as an engineer's console: a graphite-ink canvas, hairline-ruled panels (never cards), signal-lime for state and action, a warm ember for the human/social signal, and monospace as the engineered voice.

When implementation and this doc disagree, **the v2 block above wins** — fix the code.

</details>

---

## 1. What the platform actually is (service → surface map)

CollabSphere is a polyglot microservices system. The UI is the one place where six independently-built services have to feel like **one warm, coherent product**. Each service owns a surface:

| Service | Stack | Owns | UI Surface | Primary data |
|---|---|---|---|---|
| **user-service** | Java / PostgreSQL | Identity, auth, profiles, platform stats | Auth, Profile, the "you" everywhere | `signup`, `login`, `stats`, profile |
| **connections-service** | Java / **Neo4j** | The social graph (who knows whom) | My Network, people search, requests | connections, sent/received requests |
| **posts-service** | Java / PostgreSQL | The public feed, posts, comments, likes | Home / Feed | feed, posts, comments, likes |
| **spheres-service** | **Node.js** / MongoDB | Communities ("Spheres"), Reddit-style threads with votes | Spheres (browse, room, thread) | spheres, members, sphere posts, votes, comments |
| **messages-service** | **Go** / MongoDB | Direct messages, conversations, read state | Messages (inbox + chat) | conversations, messages, read |
| **notification-service** | **Python** / Kafka | Cross-service activity, async events | Notifications | notification feed |

**Design consequence — the graph is the product.** Three different services model *people relationships* (connections graph in Neo4j, sphere membership in Mongo, message threads in Mongo). The UI's job is to make those relationships feel like one continuous social fabric: the same avatar, the same name treatment, the same "presence" language everywhere a person appears. A person is a person whether they're a connection, a sphere member, or a chat partner.

**Design consequence — two posting models, one voice.** The public **feed** (posts-service, likes) and **sphere threads** (spheres-service, up/down votes) are different data models but must share one reading rhythm: the same typography, spacing, and interaction grammar, so the user never feels like they crossed a service boundary.

**Design consequence — show the engineering, tastefully.** The audience is recruiters and engineers. The polyglot story (6 languages, 3 DBs, Kafka) is a selling point. We surface it through *restraint and craft*, plus one deliberate channel: **Space Mono** metadata (timestamps, counts, IDs, service labels in the colophon) that quietly signals "engineered."

---

## 2. Brand position

Pulled directly from `PRODUCT.md` and treated as non-negotiable:

- **Community over corporate.** Spheres are *rooms*, not feature tabs. Every surface belongs to real people.
- **Warmth through craft.** Personality comes from color, expressive type, and purposeful motion — not decorative widgets or icon tiles.
- **Distinct, not derivative.** A recruiter must not be able to mistake this for a bootstrapped LinkedIn clone.
- **Alive, not exhausting.** Energy from hierarchy, motion, and contrast — never from noise, borders, or busyness.

### Anti-references (do not ship)
- ❌ **Purple→blue gradients** (`#7C3AED`, `#8B5CF6`, `#A78BFA`). The dominant AI-template look.
- ❌ **Warm cream / sand / paper body background** (warm-tinted near-white, OKLCH L 0.84–0.97 / hue 40–100). The *saturated AI default of 2026*; also the second-order "social-app-that's-not-LinkedIn → warm-coral-editorial" reflex. CollabSphere escaped it by going graphite-dark with a cool daylight counterpart.
- ❌ **Rounded, shadowed cards** as the default container; cards-in-cards; the hero-metric template (big number + small label + gradient accent). Use hairline-ruled panels and data readouts instead.
- ❌ Gradient text, decorative glassmorphism, side-stripe accent borders, eyebrow on every heading.
- ❌ LinkedIn corporate navy/white. Stiff, personality-free.

---

## 3. Color

A committed strategy: a single confident **signal-lime** carries every action and active state; a warm **ember** marks the human/social signal (likes, presence warmth); everything else is engineered neutral. Lime never decorates — it means "actionable / live / selected." Dark is the hero; daylight is the cool counterpart (never warm cream).

### Dark — the hero (graphite console)
| Token | Value | Role |
|---|---|---|
| `--bg` | `#0E0F11` | Graphite-ink canvas (cool, not warm) |
| `--bg-2` | `#08090A` | Rail / deepest wells |
| `--surface` | `#141619` | Panels |
| `--surface-2` | `#191C20` | Raised panels, avatars |
| `--text` | `#E8EAED` | Cool off-white, never pure |
| `--text-soft` | `#A2A8B0` | Secondary |
| `--text-muted` | `#6B7178` | Meta / mono captions |
| **`--accent`** | **`#C6F24E`** | Signal lime — actions, active, focus, dots. Reads ~13:1 on graphite. |
| `--accent-dim` | `rgba(198,242,78,.14)` | Active/hover tint |
| **`--ember`** | **`#FF7847`** | Human/social signal — likes, warmth. Sparingly. |
| `--success` `#7CE07A` · `--danger` `#FF5C57` · `--warning` `#FFB454` | | Status |

### Daylight — cool counterpart
| Token | Value | Role |
|---|---|---|
| `--bg` | `#F2F3F5` | Cool engineered gray (**not** warm cream) |
| `--surface` | `#FFFFFF` | Panels |
| `--text` | `#14161A` | Cool ink |
| `--text-muted` | `#757C85` | Meta |
| `--accent` (fill) | `#B4E61F` | Lime fill (with dark ink text) |
| **`--accent-ink`** | **`#4F6B00`** | Lime **text/links** on light (≥4.5:1) — lime fills need dark text, lime text needs the ink variant |
| `--ember` `#FF6A2C` · `--ember-ink` `#C2410C` | | Ember fill / readable ember text |

**Contrast rule (WCAG 2.1 AA):** body ≥ 4.5:1, large/bold ≥ 3:1. Lime fills (`--accent`) always carry **dark ink text** (`#10130A`); lime *as text* uses `--accent-ink` on light. **Color is never the only signal** — votes/status/presence pair color with icon, label, or shape.

---

## 4. Typography

One grotesk family for everything (hierarchy from weight, not a second face) + monospace as the engineered voice. No display serif — the personality is precision, not flourish.

| Role | Family | Usage |
|---|---|---|
| **UI / Display** | **Geist** (→ Space Grotesk fallback) | Everything: titles, headings, body, buttons, nav, labels. Hierarchy via weight (300→800) and size, never a second family. Titles 700 at `-0.035em`; section heads 600; body 400. |
| **Mono** | **JetBrains Mono** | Timestamps, counts, member tallies, vote scores, IDs, stat labels, rail section headings, service names. The engineered channel that carries the polyglot/DevOps story. |

**Scale** — fixed rem (product UI, consistent DPI; no fluid clamp on UI chrome):
- Page title: `1.6–2rem` / 700 / `-0.035em`
- Section head: `1.05–1.25rem` / 600 / `-0.02em`
- Body: `0.9375–1rem` / 400, line-height 1.55 (16px min on mobile inputs)
- Meta / data: `0.75–0.8125rem` / JetBrains Mono / `-0.02em`
- Reading prose capped 65–72ch; dense data may run wider.

**Rules:** mono is for data/labels only, never body prose. No eyebrow-on-every-heading. `text-wrap: balance` on headings.

---

## 5. Geometry, depth & texture

- **Radii — tight, engineered:** `--radius: 7px`, `--radius-lg: 10px`, `--radius-xl: 14px`. Not friendly-bubbly.
- **Hairline panels, not cards.** Every container is a flat `var(--surface)` with a **1px `var(--outline)` border** and *no* drop shadow. Depth comes from hairlines and the bg/surface step, not elevation. **No rounded shadowed cards, no cards-in-cards.** Lists are hairline-separated rows.
- **Shadows** are near-absent; reserved for true overlays (drawers, modals) and the lime focus glow (`--shadow-glow` = 1px lime ring). Primary CTAs get the ring, nothing else.
- **Console texture:** a fixed, faint **technical grid** (`44px`, `var(--outline)`, masked to fade downward) plus a subtle corner glow (lime top-right, ember bottom-left). Static — a console doesn't drift. Pure substrate; never reduces text contrast.

---

## 6. Motion

- **Micro-interactions:** 150–220ms. **Entrances:** 280–420ms. Spring `cubic-bezier(0.34, 1.4, 0.5, 1)` for playful pops; `cubic-bezier(0.22, 1, 0.36, 1)` for calm reveals.
- **Animate `transform` and `opacity` only** (never width/height/top).
- **Hover never shifts layout** — use color, shadow, and ≤1.03 scale on self only.
- **Feed/list items** fade-rise in with a small stagger (≤40ms step, cap the stagger so long lists don't lag).
- **`prefers-reduced-motion: reduce`** → kill the ambient drift, staggers, and scale; keep instant state changes and opacity fades only.

---

## 7. Component grammar

- **Buttons:** Primary = persimmon fill, white text, `--shadow-glow`, scale-down on active. Secondary = warm surface + subtle border. Ghost = transparent → tinted on hover. Min height 40px, touch target ≥44px. Disabled = 0.5 opacity + `not-allowed`. Async → disable + spinner, never silent.
- **Person (the universal atom):** avatar (initials on a deterministic warm color from the user id) + name in Fraunces 500 + optional Space Mono meta (role / "works at"). Identical everywhere a person appears — feed, network, sphere member, chat header. Presence dot uses jade.
- **Post / thread card:** flat warm surface, no nested card. Author row → body (≤72ch) → action row (like/vote, comment, save). Feed uses heart-like; spheres use up/down vote with a Space Mono tally. Same reading rhythm across both.
- **Sphere card:** feels like a *room* — name in Fraunces, member count + "posts today" as honey/mono stats, a warm cover wash, prominent Join. Not a feature tile.
- **Navigation:** the icon-only dock gains breathing room and labels on a left rail at ≥1024px (community presence: your spheres, who's active). Mobile keeps the bottom bar. Active state = persimmon, not a heavy pill.
- **Forms:** label always present (`<label for>`), 16px inputs (no iOS zoom), focus = 2px jade/persimmon ring + offset, errors inline next to the field with text + icon.
- **Empty states:** warm, human, single CTA. Never a sad gray box — a sentence with personality + one action.
- **Icons:** SVG only (existing Lucide-style set, 24×24 viewBox). **No emoji as icons, ever.**

---

## 8. Layout & responsive

- Content max-width **1200px**; reading columns 65–72ch.
- Breakpoints: **375 / 768 / 1024 / 1440**. No horizontal scroll at any.
- ≥1024px: left rail (nav + presence) · main · context rail. <1024px: main + bottom nav, context collapses.
- Fixed elements get edge spacing; main content is padded clear of the top bar and bottom nav. Z-index scale: `10 / 20 / 30 / 50` (rail / topbar / dropdown / modal).

---

## 9. Accessibility (WCAG 2.1 AA — required)

- Text contrast ≥ 4.5:1 (≥3:1 large/bold). Use `*-strong` tokens for text-weight color.
- Visible focus ring on **every** interactive element; tab order matches visual order.
- All icon-only buttons have `aria-label`; all meaningful images have alt text.
- Color never the sole indicator (icon/label/shape backup).
- `prefers-reduced-motion` honored everywhere.
- Inputs have associated `<label>`; errors announced near the field.

---

## 10. Pre-ship checklist

- [ ] Zero purple/violet anywhere (`grep -i '7c3aed\|8b5cf6\|a78bfa\|124, *58, *237'` → empty).
- [ ] Fraunces on titles/names/numbers; Jakarta body; Space Mono on meta only.
- [ ] No emoji icons; consistent SVG set.
- [ ] Every clickable has `cursor: pointer` + visible hover feedback (no layout shift).
- [ ] Light & dark both pass contrast; borders visible in both.
- [ ] Ambient flow respects reduced-motion and never harms contrast.
- [ ] Responsive clean at 375/768/1024/1440.
- [ ] A person looks identical across feed, network, spheres, and messages.
</content>
</invoke>
