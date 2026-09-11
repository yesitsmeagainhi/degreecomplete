import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Build the URL for a given page number. Receives page number, returns href string. */
  href: (page: number) => string;
}

export function Pagination({ currentPage, totalPages, href }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build page numbers to show: always first, last, current ±1
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      {currentPage > 1 && (
        <Link href={href(currentPage - 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-navy no-underline hover:bg-gray-50 transition-colors">
          Prev
        </Link>
      )}
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-sm text-gray-400">...</span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            className={`rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors ${
              p === currentPage
                ? "bg-blue text-white"
                : "border border-gray-200 bg-white text-navy hover:bg-gray-50"
            }`}
          >
            {p}
          </Link>
        ),
      )}
      {currentPage < totalPages && (
        <Link href={href(currentPage + 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-navy no-underline hover:bg-gray-50 transition-colors">
          Next
        </Link>
      )}
    </nav>
  );
}

/** Utility: slice an array for the current page and return page metadata */
export function paginate<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * perPage;
  return { items: items.slice(start, start + perPage), currentPage, totalPages, totalItems: items.length };
}
