# .docx → Next.js + Carbon Learning Course App

A static learning course viewer that reads content from a Word document (`.docx`), converts it to JSON at build time, and renders it as a Next.js app using the IBM Carbon design system.

**The `.docx` is the only content source.** Drop in a new document, run one command, and the course updates automatically.

---

## Starting a New Course (5 Steps)

### Step 1 — Scaffold (terminal)

```bash
npx create-next-app@latest my-course --typescript --tailwind --app --src-dir=false
cd my-course
mkdir -p scripts
```

### Step 2 — Manual file copy (from this project)

```
AGENTS.md              →  my-course/AGENTS.md
scripts/bootstrap.mjs  →  my-course/scripts/bootstrap.mjs
```

### Step 3 — Run bootstrap (terminal)

```bash
node scripts/bootstrap.mjs
```

### Step 4 — Drop your content files in (manual)

```
data/course_template.docx   ← your Word document
public/banner.jpg            ← module banner background (required)
public/placeholder.jpg       ← OPTIONAL: fallback for broken image URLs
```

### Step 5 — Generate & run

```bash
npm run parse-course && npm run dev
```

Open **http://localhost:3000** 🎉

> ⚠️ **Always use `npm`** — do not use `yarn`. Having both `yarn.lock` and `package-lock.json` in the same project breaks Next.js 16 Turbopack.

> **Updating content later?** Edit your `.docx`, drop it back in, then run `npm run parse-course && npm run dev` again.

> **No AI needed** — all 5 steps are just terminal commands and file copies. Bob is optional and only helps with questions, code changes, and debugging.

---

## Manual Setup (without Bob)

### New project from scratch

```bash
# 1. Create Next.js project
npx create-next-app@latest my-course --typescript --tailwind --app --src-dir=false
cd my-course

# 2. Copy bootstrap script
mkdir -p scripts
# copy scripts/bootstrap.mjs into scripts/bootstrap.mjs

# 3. Run bootstrap — installs everything and writes all files
node scripts/bootstrap.mjs

# 4. Add your content
cp your-course.docx data/course_template.docx
# copy banner.jpg into public/
# placeholder.jpg is optional — only used as onError fallback for broken docx image URLs

# 5. Generate course data and start
npm run parse-course
npm run dev
```

### Existing project (already bootstrapped)

```bash
# Update content — edit your .docx then:
npm run parse-course   # regenerates data/course-data.json
npm run dev            # start the app
```

---

## What the bootstrap does automatically

| Action | Detail |
|---|---|
| Install dependencies | `@carbon/react@1.33.0`, `sass`, `mammoth` |
| Create folders | `data/`, `types/`, `components/`, `app/course/`, `public/` |
| Write `types/course.ts` | TypeScript interfaces for Course, Module, Section |
| Write `components/ModuleContent.tsx` | Section renderer with Accordion, Tabs, two-column layout |
| Write `app/course/page.tsx` | Course shell: Carbon Header + SideNav + banner + content |
| Write `app/page.tsx` | Landing page with course info and Start Learning button |
| Write `app/globals.css` | Tailwind v4 base styles |
| Write `scripts/parse-docx.mjs` | Build-time `.docx` → JSON parser |
| Write `public/ibm.svg` | IBM logo placeholder |
| Patch `package.json` | Adds `parse-course` and `bootstrap` scripts |
| Create placeholder JSON | `data/course-data.json` so the app builds before you have a `.docx` |

---

## How content works

```
course_template.docx
        │
        ▼  npm run parse-course
data/course-data.json
        │
        ▼  npm run dev
  http://localhost:3000
        │
   ┌────┴─────────────────────────────────────┐
   │  /          Landing page                 │
   │  /course    Course viewer                │
   │               ├── Carbon Header + SideNav│
   │               ├── Module banner          │
   │               ├── Text + image sections  │
   │               ├── Accordion sections     │
   │               ├── Tabs sections          │
   │               ├── Mark as Complete ☑     │
   │               ├── Course completion 🎉   │
   │               └── Coming Soon (empty)    │
   └──────────────────────────────────────────┘
```

---

## SCORM Export

This project supports **SCORM 1.2** — package the course for upload to any LMS (SCORM Cloud, Moodle, Cornerstone, etc.).

### How it works

- A **"Mark as Complete"** checkbox appears at the bottom of every module
- Ticking it reports progress to the LMS via the SCORM API
- When all modules are marked complete → course completion screen is shown
- Session time is tracked automatically and reported to the LMS

### Console output (browser DevTools)

When running inside an LMS:
```
[SCORM] ✅ LMSInitialize — session started
[SCORM] 📡 Sending → lesson_status: "incomplete", session_time: "00:03:22" (1/2 modules)
[SCORM] 📡 Sending → lesson_status: "completed", session_time: "00:07:45" (2/2 modules)
[SCORM] 🏁 LMSFinish — session ended (time: 00:07:45)
```

When running in a normal browser (no LMS):
```
[SCORM] ⚠️  Not inside an LMS — SCORM calls are disabled
[SCORM] ℹ️  reportComplete called (1/2) — no LMS connected
```

### Export & upload to SCORM Cloud

```bash
npm run export-scorm
```

This builds the app and produces **`scorm-package.zip`** in the project root.

**To test on SCORM Cloud:**
1. Go to [scormcloud.com](https://scormcloud.com) → sign in
2. Click **Add Content** → **Import a SCORM Package**
3. Upload `scorm-package.zip`
4. Click **Launch** to test
5. Check the **Reports** tab to verify `lesson_status` and `session_time`

---

## Word document structure

The parser expects this format in your `.docx`:

```
COURSE INFORMATION
Course Title:  Your Course Title
Course Code:   CODE-101
Duration:      400 mins
Delivery Mode: Online Course
Course Owner:  owner@example.com

COURSE DESCRIPTION
Your course description paragraph.

Course Navigation
1   Module One Title    90 mins
2   Module Two Title    120 mins
Total Duration: ...

Module 1: Module One Title
Duration: 2 Hours

Introduction
Body text here.
Image: https://...
Suggested Layout:
Left side: Text
Right side: Image

Learning Objectives
Body text here.
Component: Accordion
Group heading one:
Item A
Item B
Component: Tabs
Tab 1 – First Tab
item one
item two
Tab 2 – Second Tab
item three
```

### Adding new section types

Open `scripts/parse-docx.mjs` and add your heading to `KNOWN_SECTION_HEADINGS`:

```js
const KNOWN_SECTION_HEADINGS = new Set([
  "Introduction",
  "Learning Objectives",
  "Types of Web Development",
  "HTML Document Structure",
  "Your New Section",   // ← add here
]);
```

Then run `npm run parse-course`.

---

## Project structure

```
data/
  course_template.docx          ← your Word document (source of truth)
  course-data.json              ← auto-generated, do not edit manually

scripts/
  bootstrap.mjs                 ← one-time project scaffold script
  parse-docx.mjs                ← .docx → JSON converter
  export-scorm.mjs              ← packages app into SCORM zip

types/
  course.ts                     ← TypeScript interfaces
  pipwerks.d.ts                 ← SCORM library type declaration

hooks/
  useSCORM.ts                   ← SCORM 1.2 session hook (timer + LMS API)

app/
  globals.css                   ← Tailwind v4 base styles
  layout.tsx                    ← Root layout
  page.tsx                      ← Landing page
  course/
    page.tsx                    ← Course viewer

components/
  ModuleContent.tsx             ← Section renderer + Mark as Complete checkbox
  CourseCompleteScreen.tsx      ← Course completion screen

public/
  ibm.svg                       ← IBM logo (written by bootstrap)
  banner.jpg                    ← Module banner image (required)
  placeholder.jpg               ← OPTIONAL: onError fallback for broken docx image URLs

scorm-package.zip               ← generated by npm run export-scorm
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run parse-course` | Parse `.docx` → `course-data.json` |
| `npm run export-scorm` | Build + package into `scorm-package.zip` for LMS upload |
| `node scripts/bootstrap.mjs` | Scaffold a new project (run once) |

---

## Stack

- **Next.js 16** — App Router, static export
- **React 19** — with TypeScript strict mode
- **@carbon/react 1.33.0** — IBM Carbon design system (Header, SideNav, Button, Tile)
- **Tailwind CSS v4** — utility classes
- **mammoth** — Word document parser
- **pipwerks-scorm-api-wrapper** — SCORM 1.2 LMS communication
- **jszip** — SCORM package zip generation
