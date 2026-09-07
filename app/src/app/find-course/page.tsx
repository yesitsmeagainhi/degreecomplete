import type { Metadata } from "next";
import { FindCourseWizard } from "./Wizard";

export const metadata: Metadata = { title: "Find my course", description: "Answer five questions to shortlist Online and Distance programs that match your qualification, budget and goal." };
export default function FindCoursePage() {
  return (
    <main className="container-x py-10">
      <h1>Find my course</h1>
      <p className="mt-3 max-w-prose text-lg text-gray-700">Five quick questions. We shortlist programs from published university data and an advisor confirms eligibility and current fees.</p>
      <div className="mt-8">
        <FindCourseWizard />
      </div>
    </main>
  );
}
