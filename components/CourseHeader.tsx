"use client";

import React from "react";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Tag } = require("@carbon/react") as {
  Tag: React.ComponentType<{ type?: string; children: React.ReactNode }>;
};
import "@carbon/styles/css/styles.css";
import type { Course } from "@/types/course";

interface Props {
  course: Course;
}

export default function CourseHeader({ course }: Props) {
  return (
    <div className="border-b border-gray-200 bg-white px-8 py-6">
      <p className="text-sm text-gray-500 mb-1 uppercase tracking-wide font-medium">
        {course.code} · {course.deliveryMode}
      </p>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">{course.title}</h1>
      <p className="text-gray-600 max-w-2xl leading-relaxed mb-4">{course.description}</p>
      <div className="flex flex-wrap gap-2">
        <Tag type="blue">⏱ {course.duration}</Tag>
        <Tag type="teal">{course.deliveryMode}</Tag>
        <Tag type="gray">👤 {course.owner}</Tag>
      </div>
    </div>
  );
}
