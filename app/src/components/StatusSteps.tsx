const steps: [string, string][] = [
  ["APPLICATION_RECEIVED", "Application received"], ["DOCUMENTS_UNDER_REVIEW", "Documents submitted"], ["DOCUMENTS_VERIFIED", "Documents verified"],
  ["UNIVERSITY_PROCESSING", "Application processing"], ["ADMISSION_CONFIRMED", "Admission confirmation"], ["NEXT_STEPS", "Next steps"],
];
const order = ["APPLICATION_RECEIVED", "DOCUMENTS_PENDING", "DOCUMENTS_UNDER_REVIEW", "DOCUMENTS_VERIFIED", "APPLICATION_SUBMITTED", "UNIVERSITY_PROCESSING", "ADMISSION_CONFIRMED", "NEXT_STEPS", "CLOSED"];

export function StatusSteps({ status }: { status: string }) {
  const idx = order.indexOf(status);
  return (
    <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Application progress">
      {steps.map(([key, label]) => {
        const done = order.indexOf(key) <= idx || (key === "DOCUMENTS_UNDER_REVIEW" && idx >= order.indexOf("DOCUMENTS_VERIFIED")) || (key === "UNIVERSITY_PROCESSING" && idx >= order.indexOf("APPLICATION_SUBMITTED"));
        const current = key === status || (status === "APPLICATION_SUBMITTED" && key === "UNIVERSITY_PROCESSING") || (status === "DOCUMENTS_PENDING" && key === "DOCUMENTS_UNDER_REVIEW");
        return (
          <li key={key} className="text-xs" aria-current={current ? "step" : undefined}>
            <div className={`h-1.5 rounded-full ${done ? "bg-blue" : "bg-line"}`} />
            <p className={`mt-1 ${current ? "font-semibold text-navy" : done ? "text-navy" : "text-gray-500"}`}>{label}</p>
          </li>
        );
      })}
    </ol>
  );
}
