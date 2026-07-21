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
        {/* IBM logo instead of Next.js logo */}
        <Image
          src="/ibm.svg"
          alt="IBM logo"
          width={80}
          height={32}
          priority
        />

        {/* Course info block */}
        <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
          <p className="text-sm font-medium uppercase tracking-widest text-gray-400">
            {courseData.code} · {courseData.deliveryMode}
          </p>
          <h1 className="max-w-sm text-3xl font-semibold leading-10 tracking-tight text-gray-900">
            {courseData.title}
          </h1>
          <p className="max-w-md text-base leading-7 text-zinc-600">
            {courseData.description}
          </p>
          <p className="text-sm text-gray-400">
            ⏱ {courseData.duration} &nbsp;·&nbsp; 👤 {courseData.owner}
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row items-center">
          <Link href="/course">
            <Button kind="primary">Start Learning</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
