import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
export const metadata: Metadata = { title: "Student login", robots: { index: false } };
export default async function StudentLogin({ searchParams: searchParamsPromise }: { searchParams: Promise<{ next?: string }> }) {
  const searchParams = await searchParamsPromise;
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-md">
        <h1>Student login</h1>
        <p className="muted mt-2">Use the mobile number and password you created when applying.</p>
        <div className="mt-6"><AuthForm kind="student" next={searchParams.next ?? "/student/dashboard"} /></div>
        <p className="muted mt-4">New here? <Link href="/apply" className="text-navy underline">Start an application</Link> to create your account.</p>
      </div>
    </div>
  );
}
