# Simplify New Project Setup to 3 Steps

---

## Top-Level Overview

The goal is to update `AGENTS.md`, `README.md`, and `learning-course-plan.md` so they all reflect the same simplified 3-step flow for starting a new course project. The key change is that `/init` in Bob triggers **bootstrap + parse-course + dev** all in one sequence — not just bootstrap alone. No code changes to `bootstrap.mjs` or any app source files are needed.

---

## Sub-Tasks

---

### Sub-Task 1 — Update `AGENTS.md` to define `/init` as a full sequence

**Intent**
`AGENTS.md` is the file Bob reads to understand how to behave. Currently the Bootstrap section only instructs Bob to run `node scripts/bootstrap.mjs`. We need to add a clear `/init` command definition that tells Bob to run all three steps in sequence: bootstrap → parse-course → dev.

**Expected Outcomes**
- `AGENTS.md` has a clearly defined `/init` section at the top of the Bootstrap block
- The `/init` definition instructs Bob to: run `node scripts/bootstrap.mjs`, then `npm run parse-course`, then `npm run dev`
- The "After bootstrap, the only manual steps are" section is updated to remove parse-course and dev (since /init now handles them)
- The "Full new-project sequence" code block is updated to reflect the 3-step flow

**Todo List**
1. Add a `/init` command block near the top of the Bootstrap section in `AGENTS.md`
2. Define the sequence Bob must follow when `/init` is triggered: bootstrap → parse-course → dev
3. Update the "After bootstrap" manual steps to only list: drop `.docx`, add `banner.jpg`
4. Update the "Full new-project sequence" code block to show the 3-step flow

**Relevant Context**
- File: `AGENTS.md` lines 13–58 (Bootstrap section)
- The `/init` trigger must be explicit so Bob recognizes it as a command

**Status:** [ ] pending

---

### Sub-Task 2 — Update `README.md` to show 3-step flow

**Intent**
The README is the human-readable documentation. The "Full sequence — new project with Bob" section currently has 6 steps. It should be updated to match the new 3-step flow that `/init` enables.

**Expected Outcomes**
- The "Full sequence — new project with Bob" section shows exactly 3 steps
- Step 1: scaffold + copy 2 files (terminal)
- Step 2: drop `.docx` and `banner.jpg` into the project
- Step 3: tell Bob `/init` (which handles bootstrap + parse + dev automatically)
- The "Manual Setup (without Bob)" section is kept as-is since it covers the no-Bob scenario
- An "Updating content later" tip is added: just tell Bob `parse the course and run dev`

**Todo List**
1. Rewrite the "Full sequence — new project with Bob" section to 3 steps
2. Add a short note under Step 3 explaining what `/init` does automatically
3. Add an "Updating content later" tip at the bottom of that section

**Relevant Context**
- File: `README.md` lines 9–49 (the Bob-specific steps section)
- The "Manual Setup" section (lines 52–84) should remain unchanged

**Status:** [ ] pending

---

### Sub-Task 3 — Update `learning-course-plan.md` Quick Start to show 3-step flow

**Intent**
The learning-course-plan.md has a "Quick Start" section at the top that still shows the old 7-step manual flow. It should be updated to show the 3-step Bob flow as the primary path, with the manual flow moved to a secondary note.

**Expected Outcomes**
- The "Quick Start" section leads with the 3-step Bob flow
- The old 7-step manual sequence is either removed or clearly labelled as "Manual (without Bob)"
- The rest of the document (Sub-Tasks 1–5, Carbon rules, spacing reference) is left unchanged

**Todo List**
1. Replace the current 7-step "Quick Start" code block with the 3-step Bob flow
2. Keep the manual sequence as a collapsed or secondary note below it
3. Leave all other sections in the file untouched

**Relevant Context**
- File: `learning-course-plan.md` lines 1–38 (Quick Start section only)

**Status:** [ ] pending

---

## Notes

- No changes to `scripts/bootstrap.mjs` or any app source files
- The 3 steps are: **terminal scaffold + copy 2 files** → **drop .docx + banner.jpg** → **tell Bob `/init`**
- `/init` in Bob = bootstrap + parse-course + dev, all automatic
