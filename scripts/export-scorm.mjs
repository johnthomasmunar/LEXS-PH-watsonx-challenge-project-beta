/**
 * export-scorm.mjs
 *
 * Packages the Next.js static export (out/) into a SCORM 1.2-compliant zip.
 *
 * Usage:
 *   npm run export-scorm
 *
 * Output:
 *   scorm-package.zip  ← upload this to SCORM Cloud or any LMS
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, dirname, relative, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const JSZip = require("jszip");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "out");
const zipPath = resolve(root, "scorm-package.zip");

// ── Load course data for manifest ────────────────────────────────────────────

const courseDataPath = resolve(root, "data/course-data.json");
if (!existsSync(courseDataPath)) {
  console.error("❌  data/course-data.json not found. Run npm run parse-course first.");
  process.exit(1);
}
if (!existsSync(outDir)) {
  console.error("❌  out/ directory not found. Run npm run build first.");
  process.exit(1);
}

const courseData = JSON.parse(readFileSync(courseDataPath, "utf8"));
const title = courseData.title || "Course";
const identifier = (courseData.code || "COURSE-001").replace(/\s+/g, "-").toUpperCase();

// ── Generate imsmanifest.xml ──────────────────────────────────────────────────

const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${identifier}" version="1"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
    http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
    http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="${identifier}-ORG">
    <organization identifier="${identifier}-ORG">
      <title>${title}</title>
      <item identifier="${identifier}-ITEM" identifierref="${identifier}-RES">
        <title>${title}</title>
        <adlcp:masteryscore>80</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${identifier}-RES" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;

// ── Recursively collect all files from a directory ───────────────────────────

function collectFiles(dir, baseDir = dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const relPath = relative(baseDir, fullPath);
    if (statSync(fullPath).isDirectory()) {
      results.push(...collectFiles(fullPath, baseDir));
    } else {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

// ── Build zip ────────────────────────────────────────────────────────────────

console.log("\n📦  Creating SCORM package...");
console.log(`   Course: ${title}`);
console.log(`   ID:     ${identifier}`);

const zip = new JSZip();

// Add imsmanifest.xml at root
zip.file("imsmanifest.xml", manifest);

// Add all files from out/
const files = collectFiles(outDir);
for (const { fullPath, relPath } of files) {
  zip.file(relPath, readFileSync(fullPath));
}

// Write zip
const content = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
writeFileSync(zipPath, content);

const kb = Math.round(content.length / 1024);
console.log(`\n✅  scorm-package.zip created (${kb} KB)`);
console.log("    Upload this file to SCORM Cloud or your LMS.\n");
