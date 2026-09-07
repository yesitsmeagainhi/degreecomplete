import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
export const metadata: Metadata = { title: "Staff login", robots: { index: false } };
export default function AdminLogin() {
  return (
    <div className="container-x py-12"><div className="mx-auto max-w-md"><h1>Staff sign in</h1><p className="muted mt-2">Admin, counsellor, operations, finance and content roles.</p><div className="mt-6"><AuthForm kind="staff" next="/admin" /></div></div></div>
  );
}
