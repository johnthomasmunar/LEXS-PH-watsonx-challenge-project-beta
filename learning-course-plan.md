# Learning Course App — Technical Plan

---

## ⚡ Quick Start — New Project (5 Steps)

> ⚠️ **Always use `npm`** — never `yarn`. Having both `yarn.lock` and `package-lock.json` breaks Next.js 16 Turbopack.

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
data/course_template.docx   ← your Word document (required)
public/banner.jpg            ← module banner background (required)
public/placeholder.jpg       ← OPTIONAL: fallback for broken docx image URLs
```

### Step 5 — Generate & run
```bash
npm run parse-course && npm run dev
```

Open **http://localhost:3000** 🎉

> **Updating content later?** Edit your `.docx`, drop it back in, then run `npm run parse-course && npm run dev` again.

> **No AI needed** — all 5 steps are just terminal commands and file copies. Bob is optional and only helps with questions, code changes, and debugging.

**What `node scripts/bootstrap.mjs` does automatically:**
- Installs `@carbon/react@1.33.0`, `sass`, `mammoth` via npm
- Creates all required folders: `data/`, `scripts/`, `types/`, `components/`, `app/course/`, `public/`
- Writes every source file: `types/course.ts`, `components/ModuleContent.tsx`, `app/course/page.tsx`, `app/page.tsx`, `app/globals.css`, `scripts/parse-docx.mjs`, `public/ibm.svg`
- Adds `parse-course` and `bootstrap` to `package.json` scripts
- Creates a placeholder `data/course-data.json` so the app boots before you have a `.docx`

---

## Goal

Build a static learning course viewer that reads content from a `.docx` Word document,
converts it to JSON at build time, and renders it as a Next.js app using Carbon design system.

**The `.docx` is the only content source.** Drop in a new document, run `npm run parse-course`,
and the course updates automatically.

---

## Top-Level Overview

- **Source:** `data/course_template.docx` — Word document with course info, module list, and section content
- **Parse step:** `npm run parse-course` → runs `scripts/parse-docx.mjs` using `mammoth` → writes `data/course-data.json`
- **Routes:** `/` (landing page) and `/course` (the course viewer)
- **UI:** Carbon `Header` + `SideNav` shell; plain React `Accordion` and `Tabs` (Carbon versions broken in React 19)
- **Images:** All document image URLs replaced with `public/placeholder.jpg` at render time

### Routing decisions
- `/` — landing page: course title, description, meta tags, "Start Learning" → `/course`
- `/course` — course shell: Carbon Header + SideNav sidebar + module banner + section content
- Switching modules does **not** change the URL — handled with `useState`

### Image decisions
- Document contains IBM internal image URLs (e.g. `w3.ibm.com/...`) — not publicly accessible
- Parser stores `image: true` flag (not the URL) in `course-data.json`
- Renderer always uses `public/placeholder.jpg` — replace with real images when available
- To use real images: store them in `public/` and update the `imageBlock` in `SectionBlock`

### Modules with no content
- Modules 3 & 4 have no content in the current document
- They render a "Coming Soon" `Tile` automatically — no code change needed
- Add content to the `.docx` and re-run `npm run parse-course` to activate them

---

## Completed Sub-Tasks

### ✅ Sub-Task 1 — Parse .docx into course-data.json

**Script:** `scripts/parse-docx.mjs`
**Command:** `npm run parse-course`
**Output shape:**
```json
{
  "title": "Web Development Fundamentals",
  "code": "WD101",
  "duration": "400 mins",
  "deliveryMode": "Online Course",
  "owner": "john.doe@ibm.com",
  "description": "...",
  "modules": [
    {
      "id": "module-1",
      "number": 1,
      "title": "Introduction to Web Development",
      "duration": "90 mins",
      "sections": [
        {
          "heading": "Introduction",
          "body": "Every website you visit...",
          "image": true,
          "layout": "text-left image-right",
          "component": null,
          "items": []
        },
        {
          "heading": "Learning Objectives",
          "body": "After completing this module...",
          "image": true,
          "layout": "image-left text-right",
          "component": null,
          "items": []
        },
        {
          "heading": "Types of Web Development",
          "body": "Front-end development focuses on...",
          "image": false,
          "layout": "text-accordion",
          "component": "Accordion",
          "items": [
            "Common technologies include:",
            "HTML", "CSS", "JavaScript",
            "Responsibilities include:",
            "Designing page layouts", "..."
          ]
        }
      ]
    },
    {
      "id": "module-2",
      "number": 2,
      "title": "HTML5 Fundamentals",
      "duration": "120 mins",
      "sections": [
        { "heading": "Introduction", "image": true, "layout": "text-left image-right", "component": null, "items": [] },
        { "heading": "Learning Objectives", "image": true, "layout": "image-left text-right", "component": null, "items": [] },
        {
          "heading": "HTML Document Structure",
          "image": false,
          "layout": "text-tabs",
          "component": "Tabs",
          "items": ["Tab 1 – DOCTYPE", "Purpose of the <!DOCTYPE html> declaration", "HTML5 document standard",
                    "Tab 2 – Head Section", "Page title", "Meta tags", "External CSS", "JavaScript references",
                    "Body Section", "Visible page content", "Headings", "Paragraphs", "Images", "Navigation"]
        }
      ]
    },
    { "id": "module-3", "number": 3, "title": "CSS3 Fundamentals", "duration": "30 mins", "sections": [] },
    { "id": "module-4", "number": 4, "title": "Responsive Web Design", "duration": "30 mins", "sections": [] }
  ]
}
```

**How the parser works:**
1. `mammoth.extractRawText()` reads the `.docx` → flat string
2. Split into lines, trim, filter empty
3. `COURSE INFORMATION` block → extract title, code, duration, deliveryMode, owner
4. `COURSE DESCRIPTION` block → join as description string
5. `Course Navigation` table → extract module number, title, duration triples
6. `Module N:` headers → find each module's line range
7. Within each module: filter noise lines (Image:, Suggested Layout:, Left/Right side:, URLs)
8. Match known section headings (`KNOWN_SECTION_HEADINGS` set) → new section object
9. `Component: Accordion/Tabs` hint → set component type, collect following short lines as items
10. `deriveLayout()` assigns layout based on heading name

**To add new section types:** add heading string to `KNOWN_SECTION_HEADINGS` set and add a `deriveLayout()` case.

---

### ✅ Sub-Task 2 — TypeScript types

**File:** `types/course.ts`
```ts
export interface Section {
  heading: string;
  body: string;
  image: boolean;
  layout: "text-left image-right" | "image-left text-right" | "text-accordion" | "text-tabs" | null;
  component: "Accordion" | "Tabs" | null;
  items: string[];
}
export interface Module {
  id: string; number: number; title: string; duration: string; sections: Section[];
}
export interface Course {
  title: string; code: string; duration: string; deliveryMode: string; owner: string;
  description: string; modules: Module[];
}
```

---

### ✅ Sub-Task 3 — Course layout shell (`app/course/page.tsx`)

**Structure:**
- Carbon `Header` (static, 48px) with IBM prefix and course title linking back to `/`
- `SideNav` (fixed, `w-56`) listing all modules with number, title, duration
- `useState(0)` tracks active module — no URL change on switch
- Module `banner.jpg` strip with dark overlay showing module number + title
- Content area: `padding: 5%` wrapper → `ModuleContent`

**Carbon UIShell import pattern** (all via `require()` — see AGENTS.md Rule 2):
```ts
const Header     = require("@carbon/react/es/components/UIShell/Header").default
const HeaderName = require("@carbon/react/es/components/UIShell/HeaderName").default
const SideNav      = require("@carbon/react/es/components/UIShell/SideNav").default
const SideNavItems = require("@carbon/react/es/components/UIShell/SideNavItems").default
const SideNavLink  = require("@carbon/react/es/components/UIShell/SideNavLink").default
```

**Sidebar spacing** (inline styles — immune to Carbon CSS):
- Label: `padding: "1.5rem 1.5rem 0.5rem"`
- Each link: `padding: "0.75rem 0"` on the inner span

---

### ✅ Sub-Task 4 — Module content renderer (`components/ModuleContent.tsx`)

**`SectionBlock`** renders one section:
- `text-left image-right` / `image-left text-right` → 2-col CSS grid, `gap-14`, `placeholder.jpg`
- `text-accordion` → text block + `AccordionSection` below (`marginTop: "3rem"`)
- `text-tabs` → text block + `TabsSection` below (`marginTop: "3rem"`)
- All sections: `padding: "4rem"` via inline style; `borderBottom: "1px solid #f3f4f6"`

**`AccordionSection`** (plain React — Carbon Accordion broken in React 19):
- `useState<number | null>(null)` — one panel open at a time
- `groupAccordionItems()` groups items: lines ending `:` → group title; rest → bullet list
- Button: `padding: "1.25rem 1.5rem"`, rotating `▾` chevron
- Open panel: `padding: "0 1.5rem 1.5rem"`
- All spacing via inline styles

**`TabsSection`** (plain React — Carbon Tabs broken in React 19):
- `useState(0)` — active tab index
- `groupTabItems()` groups items: `/^Tab \d+/i` or short title-cased lines → tab header
- Tab buttons: `padding: "0.875rem 1.5rem"`, `borderBottom` indicator
- Panel: `padding: "1.5rem 2rem"`
- All spacing via inline styles
- Keyed by `section.heading` to force remount on module switch

**`ModuleContent`** (default export):
- Empty `module.sections` → renders Carbon `Tile` "Coming Soon"
- Sections keyed `${module.id}-${idx}` — forces full remount on module switch

---

### ✅ Sub-Task 5 — Course header / landing page

**`app/page.tsx`** (landing):
- IBM logo (`/ibm.svg`)
- Course title, code, delivery mode, duration, owner from `course-data.json`
- "Start Learning" Carbon `Button` → `/course`

**`components/CourseHeader.tsx`** — exists but not used on `/course` (available for future use)

---

## File Map (copy these files to a new project)

```
COPY THESE FILES AS-IS:
  scripts/parse-docx.mjs      ← only update KNOWN_SECTION_HEADINGS for new doc structure
  types/course.ts             ← copy as-is
  components/ModuleContent.tsx ← copy as-is
  app/course/page.tsx         ← copy as-is
  app/page.tsx                ← copy as-is
  app/globals.css             ← only @import "tailwindcss" — no Carbon SCSS

REPLACE WITH YOUR CONTENT:
  data/course_template.docx   ← your Word document
  public/banner.jpg           ← your banner image
  public/placeholder.jpg      ← your placeholder image (or leave as grey box)
  public/ibm.svg              ← your logo

RUN AFTER COPYING:
  npm run parse-course        ← generates data/course-data.json from your .docx
```

---

## Carbon Components: What to Use

| Need | Use | Import |
|---|---|---|
| Top nav bar | `Header` + `HeaderName` | `require("@carbon/react/es/components/UIShell/Header").default` |
| Sidebar | `SideNav` + `SideNavItems` + `SideNavLink` | `require()` from UIShell ES path |
| CTA button | `Button` | `import { Button } from "@carbon/react"` |
| Empty state | `Tile` | `import { Tile } from "@carbon/react"` |
| Accordion | **`AccordionSection`** (plain React) | from `components/ModuleContent.tsx` |
| Tabs | **`TabsSection`** (plain React) | from `components/ModuleContent.tsx` |
| Tags/badges | plain `<span>` with inline styles | — |

**DO NOT USE from `@carbon/react`:** `Tabs`, `TabList`, `TabPanels`, `TabPanel`, `Accordion`, `AccordionItem`, `Tag` — all crash or have broken types in React 19.

---

## Spacing Reference (all inline styles)

| Element | Style |
|---|---|
| Page content wrapper | `padding: "5%"` |
| Section block | `padding: "4rem"` |
| Section separator | `borderBottom: "1px solid #f3f4f6"` |
| Accordion/Tabs top margin | `marginTop: "3rem"` |
| Accordion button | `padding: "1.25rem 1.5rem"` |
| Accordion panel | `padding: "0 1.5rem 1.5rem"` |
| Tab button | `padding: "0.875rem 1.5rem"` |
| Tab panel | `padding: "1.5rem 2rem"` |
| Sidebar label | `padding: "1.5rem 1.5rem 0.5rem"` |
| Sidebar link inner span | `padding: "0.75rem 0"` |
