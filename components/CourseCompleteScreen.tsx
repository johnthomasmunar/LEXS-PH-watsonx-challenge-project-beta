"use client";

import React from "react";
import "@carbon/styles/css/styles.css";

interface Props {
  courseTitle: string;
  totalModules: number;
  timeSpent: string;
  onReset: () => void;
}

export default function CourseCompleteScreen({ courseTitle, totalModules, timeSpent, onReset }: Props) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      padding: "4rem",
      background: "#0043ce",
      textAlign: "center",
    }}>
      {/* Checkmark circle */}
      <div style={{
        width: "6rem",
        height: "6rem",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "2rem",
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="white" width="40" height="40">
          <path d="M13 24L4 15l1.4-1.4L13 21.2 26.6 7.6 28 9z"/>
        </svg>
      </div>

      {/* Heading */}
      <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 0.75rem" }}>
        Course Complete
      </p>
      <h1 style={{ color: "white", fontSize: "2rem", fontWeight: 700, margin: "0 0 1rem", lineHeight: 1.25, maxWidth: "36rem" }}>
        Congratulations! You&apos;ve completed {courseTitle}
      </h1>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", margin: "0 0 0.5rem" }}>
        {totalModules} module{totalModules !== 1 ? "s" : ""} completed
      </p>
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", margin: "0 0 3rem" }}>
        Time spent: {timeSpent}
      </p>

      {/* Back to starts */}
      {/* <button
        onClick={onReset}
        style={{
          background: "white",
          color: "#0043ce",
          border: "none",
          padding: "0.875rem 2rem",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: "pointer",
          borderRadius: "2px",
          letterSpacing: "0.02em",
        }}
      >
        ← Back to Start
      </button> */}
    </div>
  );
}
