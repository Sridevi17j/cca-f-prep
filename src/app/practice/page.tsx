import type { Metadata } from "next";
import { Suspense } from "react";
import { PracticeExam } from "@/components/PracticeExam";

export const metadata: Metadata = {
  title: "CCA-F Practice",
  description: "Answer CCA-F practice questions and read the explanation immediately.",
};

export default function PracticePage() {
  return (
    <Suspense fallback={<p className="page-shell loading-copy">Opening the practice desk…</p>}>
      <PracticeExam />
    </Suspense>
  );
}
