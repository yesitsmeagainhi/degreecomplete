import type { Metadata } from "next";
import { dbPublic } from "@/lib/db";
import { ApplyForm } from "./ApplyForm";
import { getStudent } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Apply", description: "Start your application: choose a university and program, then upload documents and track progress in your dashboard." };

export default async function ApplyPage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ university?: string; program?: string }> }) {
  const searchParams = await searchParamsPromise;
  const universities = await dbPublic.university.findMany({
    where: { status: "ACTIVE", verificationStatus: "PUBLISHED" }, orderBy: { name: "asc" },
    select: { slug: true, name: true, programs: { where: { status: "PUBLISHED" }, orderBy: { course: "asc" }, select: { slug: true, courseDisplay: true, mode: true, specializations: { select: { name: true }, orderBy: { name: "asc" } } } } },
  });
  const student = await getStudent();
  return (
    <div className="container-x py-10">
      <h1>Apply</h1>
      <p className="mt-3 max-w-prose text-gray-700">Fill in your details, choose your program and create a login. You&apos;ll get an application ID and can upload documents from your dashboard. Nothing is sent to a university until our team has checked it with you.</p>
      <div className="mt-8 max-w-2xl"><ApplyForm universities={universities} initialUniversity={searchParams.university} initialProgram={searchParams.program} loggedIn={!!student} /></div>
    </div>
  );
}
