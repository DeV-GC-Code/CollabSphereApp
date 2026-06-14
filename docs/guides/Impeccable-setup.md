# The Impeccable Setup

**Stop shipping AI slop. Install one skill, run three commands before you ship.** Repo link, the 60-second install, and the exact commands that take a Claude-built frontend from generic to custom.

This is the full breakdown promised in the post. Skip the section you don't need.

---

## What you're about to install

**Repo:** github.com/pbakaus/impeccable · Apache-2.0 · Free · ⭐ 36k+
**Site:** impeccable.style · **By:** Paul Bakaus

A design skill for your AI coding harness. It overrides the defaults every model reaches for — Inter for everything, purple-to-blue gradients, cards nested in cards, gray text on color, the rounded-square icon tile above every heading — and gives you and your AI a **shared design vocabulary** so you can actually direct the design instead of hoping the next generation looks less generic.

What's in the box:

- **7 domain reference files** — typography, color & contrast, spatial design, motion, interaction, responsive, UX writing. Loaded on every command.
- **23 commands** — accessed through `/impeccable`. The three you'll use before every ship are below.
- **27 deterministic anti-pattern rules** + a 12-rule LLM critique pass. The deterministic ones run with no API key.

Works with Claude Code, Cursor, Gemini CLI, Codex CLI, and the rest.

---

## Install — about 60 seconds

**Recommended — the CLI installer.** From the root of your project:

```bash
npx impeccable skills install
```

It auto-detects your harness and writes the build to the right place (`.claude/skills/`, `.cursor/skills/`, etc.). Reload your harness afterward and you're done.

**Claude Code plugin (alternative):**

```
/plugin marketplace add pbakaus/impeccable
```

**Verify it's live:** in Claude Code, type `/`. You should see `/impeccable` in the slash-command list. If you do, you're installed.

---

## Pin it (the safe install)

If you want the version-pinning the safety note recommends, vendor it as a submodule instead — you control exactly which commit runs:

```bash
git submodule add https://github.com/pbakaus/impeccable .impeccable
npx impeccable skills link --source=.impeccable --providers=claude
git add .gitmodules .impeccable .claude
git commit -m "Add Impeccable (pinned)"
```

Update on your schedule, never silently:

```bash
git submodule update --remote .impeccable
npx impeccable skills link --source=.impeccable --providers=claude
```

---

## The three commands to run before you ship

This is the core of the post. After you've built something, run these in order. Each is `/impeccable <command>` (or `pin` them into standalone shortcuts).

| Command | When to run it | What it does |
| --- | --- | --- |
| `/impeccable bolder` | Design feels flat, safe, forgettable | Amplifies contrast and hierarchy. Pushes type scale, weight, and spacing so the important things actually look important. |
| `/impeccable distill` | Design feels noisy, cluttered, "too much" | Strips to the essence. Removes decorative noise, redundant borders, and nested-card sprawl until only what matters is left. |
| `/impeccable polish` | Right before you ship | Final pass — design-system alignment, spacing consistency, state coverage, and shipping readiness. The last thing you run. |

**The rhythm:** `bolder` to give it presence → `distill` to cut the noise → `polish` to ship. Most generic AI frontends just need the first two; `polish` is the seatbelt.

> Copy-paste starter — run this right after Claude builds a page:

`/impeccable bolder` then tell it which section felt weakest. Review the diff, then `/impeccable distill` to pull back anything that got loud. Finish with `/impeccable polish` before you commit.
> 

---

## The other 20 commands (when you need them)

You won't use these every time, but they're there:

| Need | Command |
| --- | --- |
| Plan UX/UI before writing code | `/impeccable shape` |
| Full shape-then-build flow | `/impeccable craft` |
| Tone *down* an overdesigned page | `/impeccable quieter` |
| Fix fonts / hierarchy / sizing | `/impeccable typeset` |
| Fix layout, spacing, rhythm | `/impeccable layout` |
| Add strategic color | `/impeccable colorize` |
| Add purposeful motion | `/impeccable animate` |
| Edge cases, i18n, text overflow | `/impeccable harden` |
| First-run flows & empty states | `/impeccable onboard` |
| UX copy that's unclear | `/impeccable clarify` |
| Accessibility / perf / responsive checks | `/impeccable audit` |
| Design review (hierarchy, clarity) | `/impeccable critique` |

Full list of 23 is in the repo README.

---

## Why this works (the one-paragraph version)

Every model was trained on the same SaaS templates, so "build me a landing page" reaches for the only visual vocabulary it knows — the average of its training data. You don't fix that by becoming a designer. You fix it by giving the model an **explicit set of anti-patterns** and a shared language to override the defaults. That's the whole trick. `bolder`, `distill`, `polish` are just the three you'll reach for most.

---

## ⚠️ One safety note before you install anything

Skills are **instructions your AI agent reads and follows.** Installing one from any public repo means you're pulling someone else's prompt straight into your harness — the same supply-chain surface as `npm install`, except the payload is natural-language instructions your agent executes. A malicious or sloppy skill could carry a **prompt injection**: hidden instructions that tell your agent to exfiltrate secrets, run commands, or quietly change its behavior.

Impeccable is widely used, open source, and Apache-licensed — low risk — but treat *every* skill (this one included) the same way:

- **Read what you're installing.** Open `skill/SKILL.src.md` and the reference files before you wire it in. It's design guidance — nothing should be touching your shell, your env vars, or the network.
- **Pin a version.** Install from a specific commit/tag rather than always pulling `main`, so an upstream change can't silently alter your agent's behavior. The Git-submodule install above makes pinning easy.
- **Scope it.** Install per-project (`.claude/skills/`) first, not globally, until you trust it.
- **Watch for the tells.** If a "design" skill asks to read `.env`, hit an external URL, or run install scripts beyond writing skill files — stop.

None of this is a knock on Impeccable. It's the price of running third-party instructions inside an agent that can act on your machine. Do it once, do it consciously, move on.