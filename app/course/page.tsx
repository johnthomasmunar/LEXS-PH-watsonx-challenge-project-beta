"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import "@carbon/styles/css/styles.css";
import courseData from "@/data/course-data.json";
import type { Course } from "@/types/course";
import ModuleContent from "@/components/ModuleContent";
import CourseCompleteScreen from "@/components/CourseCompleteScreen";
import { useSCORM } from "@/hooks/useSCORM";

/* eslint-disable @typescript-eslint/no-require-imports */
const Header       = require("@carbon/react/es/components/UIShell/Header").default        as React.ComponentType<{ "aria-label": string; className?: string; children: React.ReactNode }>;
const HeaderName   = require("@carbon/react/es/components/UIShell/HeaderName").default    as React.ComponentType<{ href?: string; prefix?: string; children: React.ReactNode; className?: string }>;
const SideNav      = require("@carbon/react/es/components/UIShell/SideNav").default       as React.ComponentType<{ isFixedNav?: boolean; expanded?: boolean; isChildOfHeader?: boolean; "aria-label"?: string; className?: string; children: React.ReactNode }>;
const SideNavItems = require("@carbon/react/es/components/UIShell/SideNavItems").default  as React.ComponentType<{ children: React.ReactNode }>;
const SideNavLink  = require("@carbon/react/es/components/UIShell/SideNavLink").default   as React.ComponentType<{ isActive?: boolean; onClick?: () => void; href?: string; children: React.ReactNode }>;
/* eslint-enable @typescript-eslint/no-require-imports */

const course = courseData as unknown as Course;

/** Modules that have content (skip Coming Soon modules for completion count) */
const completableModules = course.modules.filter((m) => m.sections && m.sections.length > 0);

/** Format seconds as H:MM:SS for display */
function formatDisplayTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function CoursePage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [showComplete, setShowComplete] = useState(false);

  const { reportComplete, getElapsed } = useSCORM(completableModules.length);

  const activeModule = course.modules[activeIndex];

  const handleModuleComplete = useCallback((moduleId: string) => {
    setCompletedModules((prev) => {
      const next = new Set(prev);
      next.add(moduleId);
      reportComplete(next.size);
      if (next.size >= completableModules.length) {
        setShowComplete(true);
      }
      return next;
    });
  }, [reportComplete]);

  const handleReset = useCallback(() => {
    setShowComplete(false);
    setCompletedModules(new Set());
    setActiveIndex(0);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* ── Carbon Header ─────────────────────────────────────────────── */}
      <Header aria-label={course.title} className="!static">
        <HeaderName href="/" prefix="IBM">
          {course.title}
        </HeaderName>
      </Header>

      {/* ── Body: sidebar + content ────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <SideNav
          isFixedNav
          expanded
          isChildOfHeader={false}
          aria-label="Course modules"
          className="!relative !w-56 !min-h-full border-r border-gray-200 bg-white shrink-0"
        >
          <SideNavItems>
            <div style={{ padding: "1.5rem 1.5rem 0.5rem" }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Modules
              </p>
            </div>
            {course.modules.map((mod, idx) => (
              <SideNavLink
                key={mod.id}
                isActive={idx === activeIndex}
                onClick={() => { setShowComplete(false); setActiveIndex(idx); }}
                href="#"
              >
                <span style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.75rem 0" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span className="text-xs text-gray-400">Module {mod.number}</span>
                    {completedModules.has(mod.id) && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="#0043ce" width="12" height="12">
                        <path d="M6 11.4L2.6 8 1.4 9.2 6 13.8 14.6 5.2 13.4 4z"/>
                      </svg>
                    )}
                  </span>
                  <span className="text-sm font-medium leading-snug">{mod.title}</span>
                  <span className="text-xs text-gray-400">{mod.duration}</span>
                </span>
              </SideNavLink>
            ))}
          </SideNavItems>
        </SideNav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {showComplete ? (
            <CourseCompleteScreen
              courseTitle={course.title}
              totalModules={completedModules.size}
              timeSpent={formatDisplayTime(getElapsed())}
              onReset={handleReset}
            />
          ) : (
            <>
              {/* Module Banner */}
              <div className="relative w-full h-48 flex items-end overflow-hidden">
                <Image
                  src="/banner.jpg"
                  alt="Module banner"
                  fill
                  className="object-cover"
                  priority
                />
                {/* dark overlay */}
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative z-10 !px-16 !pb-12">
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-2">
                    Module {activeModule.number}
                  </p>
                  <h1 className="text-3xl font-bold text-white leading-snug">
                    {activeModule.title}
                  </h1>
                  <p className="text-sm text-gray-300 mt-2">{activeModule.duration}</p>
                </div>
              </div>

              {/* Module body */}
              <div style={{ padding: "5%" }}>
                <ModuleContent
                  module={activeModule}
                  isCompleted={completedModules.has(activeModule.id)}
                  onComplete={handleModuleComplete}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
