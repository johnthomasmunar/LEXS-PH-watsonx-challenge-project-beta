"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Tile } from "@carbon/react";
import "@carbon/styles/css/styles.css";
import type { Module, Section } from "@/types/course";

interface Props {
  module: Module;
  isCompleted: boolean;
  onComplete: (moduleId: string) => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Group flat accordion items into { title, items[] } pairs.
 * Lines ending in ":" are treated as group headings; the rest are their children.
 */
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

/**
 * Group flat tab items into { title, items[] } pairs.
 * Lines matching "Tab N –" OR short title-case lines (≤30 chars, not a bullet sentence)
 * are treated as tab headers so items like "Body Section" become their own tab.
 */
function groupTabItems(raw: string[]): { title: string; items: string[] }[] {
  const groups: { title: string; items: string[] }[] = [];
  let current: { title: string; items: string[] } | null = null;

  const isTabHeader = (line: string) =>
    /^Tab \d+/i.test(line) ||
    (line.length <= 35 && /^[A-Z]/.test(line) && !line.includes(" – ") && !/^(Purpose|HTML5|Page|Meta|External|JavaScript|Visible|Headings|Paragraphs|Images|Navigation)/.test(line));

  for (const item of raw) {
    if (isTabHeader(item)) {
      if (current) groups.push(current);
      current = { title: item, items: [] };
    } else if (current) {
      current.items.push(item);
    }
  }
  if (current) groups.push(current);
  return groups;
}

// ── Section renderer ─────────────────────────────────────────────────────────

function SectionBlock({ section }: { section: Section }) {
  const imageUrl = section.image || false;
  const isTextLeft = section.layout === "text-left image-right";
  const isImageLeft = section.layout === "image-left text-right";
  const hasTwoCol = !!imageUrl && (isTextLeft || isImageLeft);

  const textBlock = (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
        {section.heading}
      </h2>
      <p className="text-base text-gray-600 leading-8 max-w-prose">
        {section.body}
      </p>
    </div>
  );

  const imageBlock = imageUrl ? (
    <div className="rounded overflow-hidden border border-gray-200 bg-gray-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={section.heading}
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg"; }}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </div>
  ) : null;

  return (
    <div
      style={{ padding: "4rem", borderBottom: "1px solid #f3f4f6" }}
      className="last:border-0"
    >
      {hasTwoCol ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-14 items-start">
          {isTextLeft ? (
            <>
              <div>{textBlock}</div>
              <div>{imageBlock}</div>
            </>
          ) : (
            <>
              <div>{imageBlock}</div>
              <div>{textBlock}</div>
            </>
          )}
        </div>
      ) : (
        textBlock
      )}

      {/* ── Accordion ─────────────────────────────────────────────────── */}
      {section.component === "Accordion" && section.items.length > 0 && (
        <div style={{ marginTop: "3rem" }}>
          <AccordionSection items={section.items} />
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      {section.component === "Tabs" && section.items.length > 0 && (
        <div style={{ marginTop: "3rem" }}>
          <TabsSection key={section.heading} heading={section.heading} items={section.items} />
        </div>
      )}
    </div>
  );
}

// ── Plain-React accordion (Carbon Accordion/AccordionItem broken in React 19) ──────────

function AccordionSection({ items }: { items: string[] }) {
  const groups = groupAccordionItems(items);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "2px", overflow: "hidden" }}>
      {groups.map((group, idx) => (
        <div key={idx} style={{ borderBottom: idx < groups.length - 1 ? "1px solid #e5e7eb" : "none" }}>
          <button
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            aria-expanded={openIdx === idx}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1.25rem 1.5rem",
              textAlign: "left",
              fontSize: "1rem",
              fontWeight: 500,
              color: "#1f2937",
              background: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            <span>{group.title}</span>
            <span style={{
              marginLeft: "1rem",
              color: "#9ca3af",
              display: "inline-block",
              transform: openIdx === idx ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}>▾</span>
          </button>
          {openIdx === idx && (
            <div style={{ padding: "0 1.5rem 1.5rem", background: "white" }}>
              {group.items.length > 0 ? (
                <ul style={{ paddingLeft: "1.5rem", margin: 0, color: "#4b5563", fontSize: "1rem", lineHeight: "1.75" }}>
                  {group.items.map((item, i) => (
                    <li key={i} style={{ marginBottom: "0.5rem" }}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "#6b7280", margin: 0 }}>{group.title}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Plain-React tabs (Carbon Tabs/TabList is broken in React 19 — crashes on .disabled) ──

function TabsSection({ heading, items }: { heading: string; items: string[] }) {
  const tabGroups = groupTabItems(items);
  const [activeTab, setActiveTab] = useState(0);
  if (tabGroups.length === 0) return null;
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "2px", overflow: "hidden" }}>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label={heading}
        style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", overflowX: "auto" }}
      >
        {tabGroups.map((tab, idx) => (
          <button
            key={idx}
            role="tab"
            aria-selected={idx === activeTab}
            onClick={() => setActiveTab(idx)}
            style={{
              padding: "0.875rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
              border: "none",
              borderBottom: idx === activeTab ? "2px solid #2563eb" : "2px solid transparent",
              color: idx === activeTab ? "#1d4ed8" : "#6b7280",
              background: idx === activeTab ? "white" : "transparent",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s, background 0.15s",
            }}
          >
            {tab.title}
          </button>
        ))}
      </div>
      {/* Tab panel */}
      <div role="tabpanel" style={{ padding: "1.5rem 2rem", background: "white" }}>
        {tabGroups[activeTab]?.items.length > 0 ? (
          <ul style={{ paddingLeft: "1.5rem", margin: 0, color: "#4b5563", fontSize: "1rem", lineHeight: "1.75" }}>
            {tabGroups[activeTab].items.map((item, i) => (
              <li key={i} style={{ marginBottom: "0.5rem" }}>{item}</li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#9ca3af", fontStyle: "italic", margin: 0 }}>No content yet.</p>
        )}
      </div>
    </div>
  );
}

// ── Mark as Complete section ──────────────────────────────────────────────────

function MarkCompleteSection({
  module,
  isCompleted,
  onComplete,
}: {
  module: Module;
  isCompleted: boolean;
  onComplete: (moduleId: string) => void;
}) {
  return (
    <div style={{
      background: isCompleted ? "#0043ce" : "#f4f4f4",
      padding: "3rem 4rem",
      display: "flex",
      alignItems: "center",
      gap: "2rem",
      marginTop: "2rem",
      borderTop: "1px solid #e5e7eb",
    }}>
      {/* Checkbox */}
      <label style={{ display: "flex", alignItems: "center", gap: "1.25rem", cursor: isCompleted ? "default" : "pointer", flexShrink: 0 }}>
        <div style={{
          width: "2rem",
          height: "2rem",
          border: isCompleted ? "2px solid white" : "2px solid #0043ce",
          borderRadius: "4px",
          background: isCompleted ? "white" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.2s",
        }}>
          {isCompleted && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="#0043ce" width="16" height="16">
              <path d="M6 11.4L2.6 8 1.4 9.2 6 13.8 14.6 5.2 13.4 4z"/>
            </svg>
          )}
        </div>
        <input
          type="checkbox"
          checked={isCompleted}
          disabled={isCompleted}
          onChange={() => { if (!isCompleted) onComplete(module.id); }}
          style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        />
        <div>
          {isCompleted ? (
            <>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.25rem" }}>
                Module {module.number} Complete
              </p>
              <p style={{ color: "white", fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
                You&apos;ve completed {module.title}
              </p>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
                Great work! Select the next module from the sidebar to continue.
              </p>
            </>
          ) : (
            <>
              <p style={{ color: "#161616", fontSize: "1rem", fontWeight: 600, margin: 0 }}>
                Mark as Complete
              </p>
              <p style={{ color: "#525252", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
                Tick the checkbox once you&apos;ve finished this module.
              </p>
            </>
          )}
        </div>
      </label>
    </div>
  );
}

// ── Module renderer ───────────────────────────────────────────────────────────

export default function ModuleContent({ module, isCompleted, onComplete }: Props) {
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
        <SectionBlock key={`${module.id}-${idx}`} section={section} />
      ))}
      <MarkCompleteSection module={module} isCompleted={isCompleted} onComplete={onComplete} />
    </div>
  );
}
