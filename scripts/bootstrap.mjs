/**
 * bootstrap.mjs
 *
 * Run once in a fresh Next.js project to scaffold the full
 * .docx → Carbon course app structure.
 *
 * Usage:
 *   node scripts/bootstrap.mjs
 *
 * What it does:
 *   1. Installs all required npm dependencies
 *   2. Creates all required folders
 *   3. Writes every source file (types, components, pages, scripts)
 *   4. Patches package.json with the parse-course script
 *   5. Prints next steps
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function log(msg) { console.log(`\n✅  ${msg}`); }
function warn(msg) { console.log(`⚠️   ${msg}`); }
function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}
function write(relPath, content) {
  const abs = resolve(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content.trimStart());
  log(`Written: ${relPath}`);
}
function mkdir(relPath) {
  mkdirSync(resolve(root, relPath), { recursive: true });
  log(`Created folder: ${relPath}`);
}

// ── 1. Install dependencies ───────────────────────────────────────────────────

console.log("\n📦  Installing dependencies...");
run("npm install @carbon/react@1.33.0 sass --legacy-peer-deps");
run("npm install --save-dev mammoth --legacy-peer-deps");

// ── 2. Create folders ────────────────────────────────────────────────────────

mkdir("data");
mkdir("scripts");
mkdir("types");
mkdir("components");
mkdir("app/course");
mkdir("public");

// ── 3. Patch package.json ────────────────────────────────────────────────────

const pkgPath = resolve(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.scripts = pkg.scripts || {};
if (!pkg.scripts["parse-course"]) {
  pkg.scripts["parse-course"] = "node scripts/parse-docx.mjs";
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  log("Patched package.json: added parse-course script");
} else {
  warn("package.json already has parse-course script — skipped");
}

// ── 4. Write types/course.ts ─────────────────────────────────────────────────

write("types/course.ts", `
export interface Section {
  heading: string;
  body: string;
  image: string | false;  // URL string from docx, or false if no image
  layout: "text-left image-right" | "image-left text-right" | "text-accordion" | "text-tabs" | null;
  component: "Accordion" | "Tabs" | null;
  items: string[];
}

export interface Module {
  id: string;
  number: number;
  title: string;
  duration: string;
  sections: Section[];
}

export interface Course {
  title: string;
  code: string;
  duration: string;
  deliveryMode: string;
  owner: string;
  description: string;
  modules: Module[];
}
`);

// ── 5. Write scripts/parse-docx.mjs ──────────────────────────────────────────

write("scripts/parse-docx.mjs", `
import mammoth from "mammoth";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docxPath = resolve(__dirname, "../data/course_template.docx");
const outPath  = resolve(__dirname, "../data/course-data.json");

const { value: raw } = await mammoth.extractRawText({ path: docxPath });
const lines = raw.split("\\n").map((l) => l.trim()).filter(Boolean);

// ── helpers ──────────────────────────────────────────────────────────────────

function isNoiseLine(line) {
  return (
    /^Suggested Layout/i.test(line) ||
    /^Left side:/i.test(line) ||
    /^Right side:/i.test(line) ||
    /^One side/i.test(line) ||
    /^Introductory text/i.test(line) ||
    /^Horizontal Tabs/i.test(line) ||
    /^HTML structure illustration/i.test(line) ||
    /^https?:\\/\\//.test(line)
  );
}

/** Extract image URL from an "Image: https://..." line, or null */
function extractImageUrl(line) {
  const m = line.match(/^Image:\\s*(https?:\\/\\/.+)/i);
  return m ? m[1].trim() : null;
}

function fieldValue(arr, prefix) {
  const line = arr.find((l) => l.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : "";
}

function between(arr, startPred, endPred) {
  const start = arr.findIndex(startPred);
  if (start === -1) return [];
  const slice = arr.slice(start + 1);
  const end = slice.findIndex(endPred);
  return end === -1 ? slice : slice.slice(0, end);
}

// ── COURSE INFORMATION ───────────────────────────────────────────────────────

const infoBlock = between(lines, (l) => l === "COURSE INFORMATION", (l) => l === "COURSE DESCRIPTION");
const title        = fieldValue(infoBlock, "Course Title:");
const code         = fieldValue(infoBlock, "Course Code:");
const duration     = fieldValue(infoBlock, "Duration:");
const deliveryMode = fieldValue(infoBlock, "Delivery Mode:");
const owner        = fieldValue(infoBlock, "Course Owner:");

const descBlock   = between(lines, (l) => l === "COURSE DESCRIPTION", (l) => l === "Course Navigation");
const description = descBlock.filter((l) => !isNoiseLine(l)).join(" ");

// ── MODULE NAV TABLE ─────────────────────────────────────────────────────────

const navBlock = between(lines, (l) => l === "Course Navigation", (l) => l.startsWith("Total Duration"));
const navModules = [];
let i = 0;
while (i < navBlock.length) {
  if (/^\\d+$/.test(navBlock[i]) && i + 2 < navBlock.length) {
    navModules.push({ number: parseInt(navBlock[i], 10), title: navBlock[i + 1], duration: navBlock[i + 2] });
    i += 3;
  } else { i++; }
}

// ── MODULE CONTENT PARSING ───────────────────────────────────────────────────

// ⚠️  ADD NEW SECTION HEADINGS HERE when your .docx introduces new sections
const KNOWN_SECTION_HEADINGS = new Set([
  "Introduction",
  "Learning Objectives",
  "Types of Web Development",
  "HTML Document Structure",
]);

function deriveLayout(heading) {
  if (heading === "Introduction")             return "text-left image-right";
  if (heading === "Learning Objectives")      return "image-left text-right";
  if (heading === "Types of Web Development") return "text-accordion";
  if (heading === "HTML Document Structure")  return "text-tabs";
  return null;
}

function parseModuleContent(moduleLines) {
  const sections = [];
  let current = null;
  let pendingComponent = null;
  let inItemCollection = false;

  for (const line of moduleLines.filter((l) => !/^Duration:/i.test(l))) {
    const imageUrl = extractImageUrl(line);
    if (imageUrl) {
      if (current && !current.image) current.image = imageUrl;
      continue;
    }
    if (isNoiseLine(line)) continue;
    if (/^Component:/i.test(line)) {
      pendingComponent = line.replace(/^Component:\\s*/i, "").trim();
      if (current) { current.component = pendingComponent; pendingComponent = null; inItemCollection = true; }
      continue;
    }
    if (KNOWN_SECTION_HEADINGS.has(line)) {
      if (current) sections.push(current);
      current = { heading: line, body: "", image: false, layout: deriveLayout(line), component: pendingComponent ?? null, items: [] };
      pendingComponent = null;
      inItemCollection = current.component !== null;
      continue;
    }
    if (!current) continue;
    if (inItemCollection && line.length < 80) { current.items.push(line); }
    else { current.body += (current.body ? " " : "") + line; inItemCollection = false; }
  }
  if (current) sections.push(current);
  return sections;
}

// ── ASSEMBLE ─────────────────────────────────────────────────────────────────

const moduleHeaderIndices = lines.reduce((acc, l, idx) => { if (/^Module \\d+:/.test(l)) acc.push(idx); return acc; }, []);

const modules = navModules.map((nav) => {
  const headerIdx = moduleHeaderIndices.find((idx) => { const m = lines[idx].match(/^Module (\\d+):/); return m && parseInt(m[1], 10) === nav.number; });
  let sections = [];
  if (headerIdx !== undefined) {
    const nextIdx = moduleHeaderIndices.find((idx) => idx > headerIdx) ?? lines.length;
    sections = parseModuleContent(lines.slice(headerIdx + 1, nextIdx));
  }
  return { id: \`module-\${nav.number}\`, number: nav.number, title: nav.title, duration: nav.duration, sections };
});

const courseData = { title, code, duration, deliveryMode, owner, description, modules };
writeFileSync(outPath, JSON.stringify(courseData, null, 2));
console.log(\`✅  Written to \${outPath}\`);
console.log(\`   \${modules.length} modules, sections: \${modules.map((m) => m.sections.length).join(", ")}\`);
`);

// ── 6. Write app/globals.css ─────────────────────────────────────────────────

write("app/globals.css", `
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
`);

// ── 7. Write types/course.ts already done above ───────────────────────────────

// ── 8. Write components/ModuleContent.tsx ────────────────────────────────────

write("components/ModuleContent.tsx", `
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Tile } from "@carbon/react";
import "@carbon/styles/css/styles.css";
import type { Module, Section } from "@/types/course";

interface Props { module: Module; }

function groupAccordionItems(raw: string[]): { title: string; items: string[] }[] {
  const groups: { title: string; items: string[] }[] = [];
  let current: { title: string; items: string[] } | null = null;
  for (const line of raw) {
    if (line.endsWith(":")) {
      if (current) groups.push(current);
      current = { title: line.replace(/:$/, ""), items: [] };
    } else {
      if (!current) current = { title: line, items: [] };
      else current.items.push(line);
    }
  }
  if (current) groups.push(current);
  return groups;
}

function groupTabItems(raw: string[]): { title: string; items: string[] }[] {
  const groups: { title: string; items: string[] }[] = [];
  let current: { title: string; items: string[] } | null = null;
  const isTabHeader = (line: string) =>
    /^Tab \\d+/i.test(line) ||
    (line.length <= 35 && /^[A-Z]/.test(line) && !line.includes(" – ") &&
     !/^(Purpose|HTML5|Page|Meta|External|JavaScript|Visible|Headings|Paragraphs|Images|Navigation)/.test(line));
  for (const item of raw) {
    if (isTabHeader(item)) { if (current) groups.push(current); current = { title: item, items: [] }; }
    else if (current) { current.items.push(item); }
  }
  if (current) groups.push(current);
  return groups;
}

function SectionBlock({ section }: { section: Section }) {
  const hasTwoCol = section.image && (section.layout === "text-left image-right" || section.layout === "image-left text-right");
  const isTextLeft = section.layout === "text-left image-right";

  const textBlock = (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-900 tracking-tight">{section.heading}</h2>
      <p className="text-base text-gray-600 leading-8 max-w-prose">{section.body}</p>
    </div>
  );

  const imageBlock = (
    <div className="rounded overflow-hidden border border-gray-200 bg-gray-100">
      <img
        src={typeof section.image === "string" ? section.image : "/placeholder.jpg"}
        alt={section.heading}
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg"; }}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </div>
  );

  return (
    <div style={{ padding: "4rem", borderBottom: "1px solid #f3f4f6" }} className="last:border-0">
      {hasTwoCol ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-14 items-start">
          {isTextLeft ? <><div>{textBlock}</div><div>{imageBlock}</div></> : <><div>{imageBlock}</div><div>{textBlock}</div></>}
        </div>
      ) : textBlock}

      {section.component === "Accordion" && section.items.length > 0 && (
        <div style={{ marginTop: "3rem" }}><AccordionSection items={section.items} /></div>
      )}
      {section.component === "Tabs" && section.items.length > 0 && (
        <div style={{ marginTop: "3rem" }}>
          <TabsSection key={section.heading} heading={section.heading} items={section.items} />
        </div>
      )}
    </div>
  );
}

function AccordionSection({ items }: { items: string[] }) {
  const groups = groupAccordionItems(items);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "2px", overflow: "hidden" }}>
      {groups.map((group, idx) => (
        <div key={idx} style={{ borderBottom: idx < groups.length - 1 ? "1px solid #e5e7eb" : "none" }}>
          <button onClick={() => setOpenIdx(openIdx === idx ? null : idx)} aria-expanded={openIdx === idx}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "1.25rem 1.5rem", textAlign: "left", fontSize: "1rem", fontWeight: 500,
              color: "#1f2937", background: "white", border: "none", cursor: "pointer" }}>
            <span>{group.title}</span>
            <span style={{ marginLeft: "1rem", color: "#9ca3af", display: "inline-block",
              transform: openIdx === idx ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
          </button>
          {openIdx === idx && (
            <div style={{ padding: "0 1.5rem 1.5rem", background: "white" }}>
              {group.items.length > 0
                ? <ul style={{ paddingLeft: "1.5rem", margin: 0, color: "#4b5563", fontSize: "1rem", lineHeight: "1.75" }}>
                    {group.items.map((item, i) => <li key={i} style={{ marginBottom: "0.5rem" }}>{item}</li>)}
                  </ul>
                : <p style={{ color: "#6b7280", margin: 0 }}>{group.title}</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TabsSection({ heading, items }: { heading: string; items: string[] }) {
  const tabGroups = groupTabItems(items);
  const [activeTab, setActiveTab] = useState(0);
  if (tabGroups.length === 0) return null;
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "2px", overflow: "hidden" }}>
      <div role="tablist" aria-label={heading}
        style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", overflowX: "auto" }}>
        {tabGroups.map((tab, idx) => (
          <button key={idx} role="tab" aria-selected={idx === activeTab} onClick={() => setActiveTab(idx)}
            style={{ padding: "0.875rem 1.5rem", fontSize: "0.875rem", fontWeight: 500, whiteSpace: "nowrap",
              border: "none", borderBottom: idx === activeTab ? "2px solid #2563eb" : "2px solid transparent",
              color: idx === activeTab ? "#1d4ed8" : "#6b7280",
              background: idx === activeTab ? "white" : "transparent",
              cursor: "pointer", transition: "color 0.15s, border-color 0.15s, background 0.15s" }}>
            {tab.title}
          </button>
        ))}
      </div>
      <div role="tabpanel" style={{ padding: "1.5rem 2rem", background: "white" }}>
        {tabGroups[activeTab]?.items.length > 0
          ? <ul style={{ paddingLeft: "1.5rem", margin: 0, color: "#4b5563", fontSize: "1rem", lineHeight: "1.75" }}>
              {tabGroups[activeTab].items.map((item, i) => <li key={i} style={{ marginBottom: "0.5rem" }}>{item}</li>)}
            </ul>
          : <p style={{ color: "#9ca3af", fontStyle: "italic", margin: 0 }}>No content yet.</p>}
      </div>
    </div>
  );
}

export default function ModuleContent({ module }: Props) {
  if (!module.sections || module.sections.length === 0) {
    return (
      <Tile className="p-10 text-center">
        <h2 className="text-base font-semibold text-gray-400 mb-2">Coming Soon</h2>
        <p className="text-sm text-gray-400">
          Content for <strong className="text-gray-500">{module.title}</strong> is not yet available.
        </p>
      </Tile>
    );
  }
  return (
    <div className="divide-y divide-gray-100">
      {module.sections.map((section, idx) => (
        <SectionBlock key={\`\${module.id}-\${idx}\`} section={section} />
      ))}
    </div>
  );
}
`);

// ── 9. Write app/course/page.tsx ─────────────────────────────────────────────

write("app/course/page.tsx", `
"use client";

import React, { useState } from "react";
import Image from "next/image";
import "@carbon/styles/css/styles.css";
import courseData from "@/data/course-data.json";
import type { Course } from "@/types/course";
import ModuleContent from "@/components/ModuleContent";

/* eslint-disable @typescript-eslint/no-require-imports */
const Header       = require("@carbon/react/es/components/UIShell/Header").default        as React.ComponentType<{ "aria-label": string; className?: string; children: React.ReactNode }>;
const HeaderName   = require("@carbon/react/es/components/UIShell/HeaderName").default    as React.ComponentType<{ href?: string; prefix?: string; children: React.ReactNode; className?: string }>;
const SideNav      = require("@carbon/react/es/components/UIShell/SideNav").default       as React.ComponentType<{ isFixedNav?: boolean; expanded?: boolean; isChildOfHeader?: boolean; "aria-label"?: string; className?: string; children: React.ReactNode }>;
const SideNavItems = require("@carbon/react/es/components/UIShell/SideNavItems").default  as React.ComponentType<{ children: React.ReactNode }>;
const SideNavLink  = require("@carbon/react/es/components/UIShell/SideNavLink").default   as React.ComponentType<{ isActive?: boolean; onClick?: () => void; href?: string; children: React.ReactNode }>;
/* eslint-enable @typescript-eslint/no-require-imports */

const course = courseData as unknown as Course;

export default function CoursePage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeModule = course.modules[activeIndex];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header aria-label={course.title} className="!static">
        <HeaderName href="/" prefix="IBM">{course.title}</HeaderName>
      </Header>

      <div className="flex flex-1 overflow-hidden" style={{ marginTop: 48 }}>
        <SideNav isFixedNav expanded isChildOfHeader={false} aria-label="Course modules"
          className="!relative !w-56 !min-h-full border-r border-gray-200 bg-white shrink-0">
          <SideNavItems>
            <div style={{ padding: "1.5rem 1.5rem 0.5rem" }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Modules</p>
            </div>
            {course.modules.map((mod, idx) => (
              <SideNavLink key={mod.id} isActive={idx === activeIndex} onClick={() => setActiveIndex(idx)} href="#">
                <span style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.75rem 0" }}>
                  <span className="text-xs text-gray-400">Module {mod.number}</span>
                  <span className="text-sm font-medium leading-snug">{mod.title}</span>
                  <span className="text-xs text-gray-400">{mod.duration}</span>
                </span>
              </SideNavLink>
            ))}
          </SideNavItems>
        </SideNav>

        <main className="flex-1 overflow-y-auto">
          <div className="relative w-full h-48 flex items-end overflow-hidden">
            <Image src="/banner.jpg" alt="Module banner" fill className="object-cover" priority />
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative z-10 px-10 pb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-2">Module {activeModule.number}</p>
              <h1 className="text-3xl font-bold text-white leading-snug">{activeModule.title}</h1>
              <p className="text-sm text-gray-300 mt-2">{activeModule.duration}</p>
            </div>
          </div>
          <div style={{ padding: "5%" }}>
            <ModuleContent module={activeModule} />
          </div>
        </main>
      </div>
    </div>
  );
}
`);

// ── 10. Write app/page.tsx ───────────────────────────────────────────────────

write("app/page.tsx", `
"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@carbon/react";
import "@carbon/styles/css/styles.css";
import courseData from "@/data/course-data.json";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white sm:items-start">
        <Image src="/ibm.svg" alt="IBM logo" width={80} height={32} priority />
        <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
          <p className="text-sm font-medium uppercase tracking-widest text-gray-400">
            {courseData.code} · {courseData.deliveryMode}
          </p>
          <h1 className="max-w-sm text-3xl font-semibold leading-10 tracking-tight text-gray-900">
            {courseData.title}
          </h1>
          <p className="max-w-md text-base leading-7 text-zinc-600">{courseData.description}</p>
          <p className="text-sm text-gray-400">⏱ {courseData.duration} &nbsp;·&nbsp; 👤 {courseData.owner}</p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row items-center">
          <Link href="/course"><Button kind="primary">Start Learning</Button></Link>
        </div>
      </main>
    </div>
  );
}
`);

// ── 11. Write placeholder data/course-data.json ──────────────────────────────

const placeholderJson = resolve(root, "data/course-data.json");
if (!existsSync(placeholderJson)) {
  write("data/course-data.json", JSON.stringify({
    title: "Your Course Title",
    code: "COURSE-101",
    duration: "0 mins",
    deliveryMode: "Online Course",
    owner: "owner@example.com",
    description: "Drop your .docx file as data/course_template.docx and run: npm run parse-course",
    modules: []
  }, null, 2));
} else {
  warn("data/course-data.json already exists — skipped");
}

// ── 12. Write placeholder public/ibm.svg ─────────────────────────────────────

write("public/ibm.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" fill="#0f62fe">
  <path d="M0 0h56v8H0zM0 16h56v8H0zM8 32h40v8H8zM8 48h40v8H8z"/>
</svg>`);

// ── Done ─────────────────────────────────────────────────────────────────────

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉  Bootstrap complete!

Next steps:
  1. Drop your Word document here:
     data/course_template.docx

  2. Add your images to public/:
     public/banner.jpg      ← module banner background (required)
     public/placeholder.jpg ← OPTIONAL: fallback if a docx image URL fails to load

  3. Generate the course data:
     npm run parse-course

  4. Start the dev server:
     npm run dev

  5. Open http://localhost:3000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
