import mammoth from "mammoth";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docxPath = resolve(__dirname, "../data/course_template.docx");
const outPath = resolve(__dirname, "../data/course-data.json");

const { value: raw } = await mammoth.extractRawText({ path: docxPath });
const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

// ── helpers ──────────────────────────────────────────────────────────────────

/** Lines that are document-template noise (layout hints, etc.) */
function isNoiseLine(line) {
  return (
    /^Suggested Layout/i.test(line) ||
    /^Left side:/i.test(line) ||
    /^Right side:/i.test(line) ||
    /^One side/i.test(line) ||
    /^Introductory text/i.test(line) ||
    /^Horizontal Tabs/i.test(line) ||
    /^HTML structure illustration/i.test(line)
  );
}

/** Extract image URL from an "Image: https://..." line, or null */
function extractImageUrl(line) {
  const m = line.match(/^Image:\s*(https?:\/\/.+)/i);
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

const infoBlock = between(
  lines,
  (l) => l === "COURSE INFORMATION",
  (l) => l === "COURSE DESCRIPTION"
);

const title = fieldValue(infoBlock, "Course Title:");
const code = fieldValue(infoBlock, "Course Code:");
const duration = fieldValue(infoBlock, "Duration:");
const deliveryMode = fieldValue(infoBlock, "Delivery Mode:");
const owner = fieldValue(infoBlock, "Course Owner:");

// ── COURSE DESCRIPTION ───────────────────────────────────────────────────────

const descBlock = between(
  lines,
  (l) => l === "COURSE DESCRIPTION",
  (l) => l === "Course Navigation"
);
const description = descBlock.filter((l) => !isNoiseLine(l)).join(" ");

// ── MODULE NAV TABLE ─────────────────────────────────────────────────────────

const navBlock = between(
  lines,
  (l) => l === "Course Navigation",
  (l) => l.startsWith("Total Duration")
);

const navModules = [];
let i = 0;
while (i < navBlock.length) {
  if (/^\d+$/.test(navBlock[i]) && i + 2 < navBlock.length) {
    navModules.push({
      number: parseInt(navBlock[i], 10),
      title: navBlock[i + 1],
      duration: navBlock[i + 2],
    });
    i += 3;
  } else {
    i++;
  }
}

// ── MODULE CONTENT PARSING ───────────────────────────────────────────────────

// Known section headings within modules
const KNOWN_SECTION_HEADINGS = new Set([
  "Introduction",
  "Learning Objectives",
  "Types of Web Development",
  "HTML Document Structure",
]);

/**
 * Given lines belonging to one module (after the "Module N: Title" header line),
 * return a structured sections array.
 */
function parseModuleContent(moduleLines) {
  // Filter out noise and duration lines
  const clean = moduleLines.filter(
    (l) => !isNoiseLine(l) && !/^Duration:/i.test(l)
  );

  const sections = [];
  let current = null;
  let pendingComponent = null;
  let inItemCollection = false;

  for (let j = 0; j < clean.length; j++) {
    const line = clean[j];

    // Image URL — capture it into the current section
    const imageUrl = extractImageUrl(line);
    if (imageUrl) {
      if (current && !current.image) current.image = imageUrl;
      continue;
    }

    // Bare URL line (not prefixed with "Image:") — skip
    if (/^https?:\/\//.test(line)) continue;

    // Component hint — attach to current or next section
    if (/^Component:/i.test(line)) {
      pendingComponent = line.replace(/^Component:\s*/i, "").trim();
      if (current) {
        current.component = pendingComponent;
        pendingComponent = null;
        inItemCollection = true;
      }
      continue;
    }

    // Is this a known section heading?
    const isKnownHeading = KNOWN_SECTION_HEADINGS.has(line);

    if (isKnownHeading) {
      if (current) sections.push(current);
      current = {
        heading: line,
        body: "",
        image: false, // will be set when we hit an "Image: url" line
        layout: deriveLayout(line),
        component: pendingComponent ?? null,
        items: [],
      };
      pendingComponent = null;
      inItemCollection = current.component !== null;
      continue;
    }

    if (!current) continue;

    // After a Component: hint, short lines become accordion/tab items
    if (inItemCollection && line.length < 80) {
      current.items.push(line);
    } else {
      current.body += (current.body ? " " : "") + line;
      inItemCollection = false;
    }
  }

  if (current) sections.push(current);
  return sections;
}

function deriveLayout(heading) {
  // Introduction and Learning Objectives have image+text layouts per the document
  if (heading === "Introduction") return "text-left image-right";
  if (heading === "Learning Objectives") return "image-left text-right";
  if (heading === "Types of Web Development") return "text-accordion";
  if (heading === "HTML Document Structure") return "text-tabs";
  return null;
}

// ── ASSEMBLE MODULES ─────────────────────────────────────────────────────────

const moduleHeaderIndices = lines.reduce((acc, l, idx) => {
  if (/^Module \d+:/.test(l)) acc.push(idx);
  return acc;
}, []);

const modules = navModules.map((nav) => {
  const headerIdx = moduleHeaderIndices.find((idx) => {
    const m = lines[idx].match(/^Module (\d+):/);
    return m && parseInt(m[1], 10) === nav.number;
  });

  let sections = [];
  if (headerIdx !== undefined) {
    const nextHeaderIdx =
      moduleHeaderIndices.find((idx) => idx > headerIdx) ?? lines.length;
    const moduleLines = lines.slice(headerIdx + 1, nextHeaderIdx);
    sections = parseModuleContent(moduleLines);
  }

  return {
    id: `module-${nav.number}`,
    number: nav.number,
    title: nav.title,
    duration: nav.duration,
    sections,
  };
});

// ── OUTPUT ───────────────────────────────────────────────────────────────────

const courseData = { title, code, duration, deliveryMode, owner, description, modules };
writeFileSync(outPath, JSON.stringify(courseData, null, 2));
console.log(`✅  Written to ${outPath}`);
console.log(`   ${modules.length} modules, sections: ${modules.map((m) => m.sections.length).join(", ")}`);
