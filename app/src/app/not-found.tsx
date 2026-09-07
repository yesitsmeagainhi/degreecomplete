import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container-x py-24">
      <h1>We couldn&apos;t find that page.</h1>
      <p className="mt-3 max-w-prose text-gray-700">The program or page may have moved, or it isn&apos;t published yet. Try the search, or browse universities.</p>
      <div className="mt-6 flex gap-3"><Link href="/search" className="btn-primary">Search programs</Link><Link href="/universities" className="btn-outline">Browse universities</Link></div>
    </div>
  );
}
