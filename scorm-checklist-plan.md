# SCORM Checklist + Completion Tracking Plan

---

## Top-Level Overview

Add a **"Mark as Complete" checklist** at the bottom of each module that:
1. Lets the user tick a single checkbox to mark a module done
2. Tracks a **session timer** that starts when the course loads
3. Reports **completion status + time spent** to a SCORM 1.2 LMS via the SCORM API
4. Shows a **course completion screen** when all modules are marked done
5. Works on **SCORM Cloud** for testing

The SCORM API (`API` object on `window`) is injected by the LMS at runtime. The app must call it at the right moments: on load (`LMSInitialize`), on completion (`LMSSetValue`), and on exit (`LMSFinish`).

No backend is needed — SCORM communication is purely client-side JavaScript talking to the LMS iframe API.

---

## Architecture

```
app/course/page.tsx
  └── useSCORM() hook          ← initializes API, tracks time, reports status
  └── completedModules state   ← Set<string> of completed module IDs
  └── ModuleContent            ← receives onComplete callback
        └── MarkCompleteSection ← checkbox UI at bottom of module
  └── CourseCompleteScreen     ← shown when all modules done
```

---

## Sub-Tasks

---

### Sub-Task 1 — Install SCORM API wrapper library

**Intent**
Use `pipwerks-scorm-api-wrapper` — a lightweight, battle-tested JS library that handles SCORM 1.2 API calls. It abstracts `window.API` detection, `LMSInitialize`, `LMSSetValue`, `LMSGetValue`, and `LMSFinish`.

**Expected Outcomes**
- `pipwerks-scorm-api-wrapper` installed as a dependency
- TypeScript types available (or a simple `.d.ts` declaration added)

**Todo List**
1. Run `npm install pipwerks-scorm-api-wrapper`
2. If no types exist, create `types/pipwerks.d.ts` with a minimal module declaration

**Relevant Context**
- Package: `pipwerks-scorm-api-wrapper` on npm
- SCORM version to target: **1.2** (widest LMS compatibility, works on SCORM Cloud)

**Status:** [ ] pending

---

### Sub-Task 2 — Create `useSCORM` hook

**Intent**
Encapsulate all SCORM communication in a single React hook so `app/course/page.tsx` stays clean. The hook handles: initialize, set completion status, set time, and finish.

**Expected Outcomes**
- New file: `hooks/useSCORM.ts`
- Hook exposes: `reportComplete(modulesDone, totalModules)` and `reportTime(seconds)`
- On mount: calls `SCORM.init()` and starts a `setInterval` timer
- On unmount: calls `SCORM.quit()` and reports final time
- `reportComplete` sets `cmi.core.lesson_status` to `"completed"` when `modulesDone === totalModules`, otherwise `"incomplete"`
- Time reported via `cmi.core.session_time` in `HH:MM:SS` format (SCORM 1.2 requirement)

**Todo List**
1. Create `hooks/useSCORM.ts`
2. Import `pipwerks-scorm-api-wrapper` as `SCORM`
3. `useEffect` on mount: `SCORM.version = "1.2"`, `SCORM.init()`, start 1-second interval timer
4. `useEffect` cleanup: stop timer, call `reportTime`, call `SCORM.quit()`
5. Expose `reportComplete(completedCount, totalCount)` function
6. Format seconds → `HH:MM:SS` for `cmi.core.session_time`

**Relevant Context**
- File to create: `hooks/useSCORM.ts`
- SCORM 1.2 key fields:
  - `cmi.core.lesson_status` → `"passed" | "completed" | "incomplete" | "not attempted"`
  - `cmi.core.session_time` → `"HH:MM:SS"`
- `SCORM.set(key, value)` and `SCORM.save()` after each update

**Status:** [ ] pending

---

### Sub-Task 3 — Replace `ModuleCompletionBanner` with `MarkCompleteSection`

**Intent**
Replace the existing static blue banner in `components/ModuleContent.tsx` with an interactive **"Mark as Complete"** checkbox section. The checkbox triggers a callback up to the parent when ticked.

**Expected Outcomes**
- `ModuleCompletionBanner` replaced with `MarkCompleteSection`
- `MarkCompleteSection` shows:
  - An unchecked state: IBM Blue background, checkbox + "Mark as Complete" label
  - A checked state: darker blue / green tint, checkmark icon + "Module Complete" confirmed message
- `ModuleContent` accepts `onComplete` and `isCompleted` props
- Clicking the checkbox calls `onComplete(module.id)`

**Todo List**
1. Add `onComplete: (moduleId: string) => void` and `isCompleted: boolean` to `ModuleContent` props
2. Replace `ModuleCompletionBanner` with `MarkCompleteSection` component
3. `MarkCompleteSection` renders a styled checkbox using a plain `<input type="checkbox">` (not Carbon — avoids React 19 crashes)
4. Checked state shows: checkmark + "You've completed [module title]" in confirmed style
5. Unchecked state shows: empty checkbox + "Mark this module as complete"
6. All styling via inline `style` props (immune to Carbon CSS)

**Relevant Context**
- File: `components/ModuleContent.tsx`
- Existing `ModuleCompletionBanner` at line 239 — replace entirely
- Carbon `Checkbox` component — **do not use** (same React 19 crash risk as Tabs/Accordion)
- Use plain `<input type="checkbox">` with custom styling instead

**Status:** [ ] pending

---

### Sub-Task 4 — Wire completion state in `app/course/page.tsx`

**Intent**
Add `completedModules` state to the course page, wire it to `ModuleContent`'s `onComplete` callback, integrate with `useSCORM`, and show the course completion screen when all modules are done.

**Expected Outcomes**
- `completedModules: Set<string>` state tracks which module IDs are done
- `ModuleContent` receives `onComplete` and `isCompleted={completedModules.has(mod.id)}`
- When a module is marked complete: `useSCORM.reportComplete(completedModules.size, totalModules)` is called
- Sidebar shows a ✓ indicator next to completed modules
- When all modules are complete: `CourseCompleteScreen` is shown instead of module content

**Todo List**
1. Add `completedModules` state: `useState<Set<string>>(new Set())`
2. Add `handleModuleComplete(moduleId: string)` function
3. Call `useSCORM` hook, pass `reportComplete` into `handleModuleComplete`
4. Pass `onComplete={handleModuleComplete}` and `isCompleted` to `ModuleContent`
5. Add ✓ checkmark next to completed module titles in the sidebar
6. Conditionally render `CourseCompleteScreen` when `completedModules.size === course.modules.length`

**Relevant Context**
- File: `app/course/page.tsx`
- `useSCORM` hook from Sub-Task 2
- Only modules with sections count toward completion (skip "Coming Soon" modules)

**Status:** [ ] pending

---

### Sub-Task 5 — Build `CourseCompleteScreen`

**Intent**
A full-content-area screen shown when the user has marked all modules complete. Reports final completion to SCORM and shows a congratulations message.

**Expected Outcomes**
- New component: `components/CourseCompleteScreen.tsx`
- Shows: large checkmark, "Course Complete" heading, course title, total time spent, "Back to Start" link
- IBM Blue background, white text — consistent with module completion banner style
- On mount: calls `useSCORM.reportComplete` one final time to ensure SCORM is updated

**Todo List**
1. Create `components/CourseCompleteScreen.tsx`
2. Accept props: `courseTitle`, `totalModules`, `timeSpent` (formatted string)
3. Render full-width blue panel with checkmark SVG, heading, subtitle, time spent
4. Add "← Back to Start" link that resets `completedModules` and returns to module 1
5. All styling via inline `style` props

**Relevant Context**
- File to create: `components/CourseCompleteScreen.tsx`
- Rendered in `app/course/page.tsx` when all modules complete
- Time displayed comes from `useSCORM` hook's elapsed timer

**Status:** [ ] pending

---

### Sub-Task 6 — Add SCORM export script

**Intent**
Add `npm run export-scorm` that packages the built Next.js app into a SCORM 1.2-compliant `.zip` file ready to upload to SCORM Cloud or any LMS.

**Expected Outcomes**
- New file: `scripts/export-scorm.mjs`
- Running `npm run export-scorm` produces `scorm-package.zip` in the project root
- The zip contains: `imsmanifest.xml`, `index.html` (entry point), and all built assets from `out/`
- `imsmanifest.xml` generated from `data/course-data.json` (title, identifier, version)
- `package.json` gets `"export-scorm": "next build && next export && node scripts/export-scorm.mjs"` script

**Todo List**
1. Add `output: "export"` to `next.config.ts` to enable static export
2. Create `scripts/export-scorm.mjs`
3. Generate `imsmanifest.xml` from course title/code in `course-data.json`
4. Zip `out/` folder + `imsmanifest.xml` into `scorm-package.zip` using Node's `archiver` or `jszip`
5. Add `export-scorm` script to `package.json`
6. Install `archiver` as devDependency: `npm install --save-dev archiver`

**Relevant Context**
- File to create: `scripts/export-scorm.mjs`
- Next.js static export output goes to `out/` directory
- SCORM 1.2 manifest minimum fields: `identifier`, `title`, `masteryScore`, `schemaversion`
- Entry point in manifest must point to `index.html`

**Status:** [ ] pending

---

## Notes

- Sub-Tasks 1 → 2 → 3 → 4 → 5 must be done in order (each builds on the previous)
- Sub-Task 6 (export script) is independent and can be done last
- SCORM API calls are no-ops when not inside an LMS iframe — the app works normally in a browser without an LMS
- Test on SCORM Cloud: upload `scorm-package.zip`, launch course, complete all modules, verify `lesson_status = completed` and `session_time` in the SCORM Cloud reports
