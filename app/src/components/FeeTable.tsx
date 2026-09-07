import type { PublicFee } from "@/lib/catalog";
import { inr, planLabel, examBasisLabel, dateLabel, intakeLabel } from "@/lib/format";
import { site } from "@/lib/config";

/**
 * Renders the fee rows of a program grouped by specialization and plan.
 * Every figure comes from a PUBLISHED FeeRecord. Missing components are omitted, never estimated.
 */
export function FeeTable({ fees, course, approx }: { fees: PublicFee[]; course: string; approx?: number | null }) {
  if (!fees.length) {
    return (
      <div className="rounded-xl2 border border-dashed border-line bg-mist p-5">
        {approx ? (
          <>
            <p className="font-medium text-navy">Approximately {inr(approx)} total, as listed by the university</p>
            <p className="muted mt-1">The itemised fee for this program is still being verified. Our advisor will confirm the exact registration, exam and tuition amounts and payment plans before you pay anything.</p>
          </>
        ) : (
          <>
            <p className="font-medium text-navy">{site.contactToConfirmFee}</p>
            <p className="muted mt-1">The fee for this program is being verified. Our advisor will share the current university fee structure with you.</p>
          </>
        )}
      </div>
    );
  }
  const groups = new Map<string, PublicFee[]>();
  for (const f of fees) {
    const k = f.specialization ?? "";
    groups.set(k, [...(groups.get(k) ?? []), f]);
  }
  const lastUpdated = fees.map((f) => f.publishedAt ?? f.updatedAt).sort().at(-1);
  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([spec, rows]) => (
        <section key={spec || "all"} className="card">
          <h3 className="mb-1">{spec ? `${course} — ${spec}` : `${course} fee structure`}</h3>
          <p className="muted mb-4">{intakeLabel(rows[0].effectiveIntake)}</p>
          <div className="space-y-5">
            {rows.map((f) => <FeeBlock key={f.id} f={f} />)}
          </div>
        </section>
      ))}
      <p className="text-xs text-gray-500">Last updated: {dateLabel(lastUpdated)}. {site.feeDisclaimer}</p>
    </div>
  );
}

function Row({ label, value, note }: { label: string; value: number | null | undefined; note?: string }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0">
      <dt className="text-sm text-gray-600">{label}{note ? <span className="text-gray-400"> ({note})</span> : null}</dt>
      <dd className="font-medium text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{inr(value)}</dd>
    </div>
  );
}

function FeeBlock({ f }: { f: PublicFee }) {
  const headline = f.totalProgramFee ?? f.fullPlanFee ?? f.tuitionTotal ?? null;
  const inst = Array.isArray(f.installments) ? (f.installments as number[]) : null;
  const hasPlans = f.semesterPlanFee || f.annualPlanFee || f.fullPlanFee;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-navy">{planLabel(f.planType)}{f.discountPct ? ` · ${f.discountPct}% reduction applied` : ""}</p>
        {headline !== null && <p className="fee-figure">{inr(headline)} <span className="text-sm font-sans text-gray-500">{f.totalProgramFee ? "total program fee" : f.fullPlanFee ? "one-time payment" : "total tuition"}</span></p>}
      </div>
      <dl>
        <Row label="Registration / prospectus fee" value={f.registrationFee} note="one-time" />
        <Row label="Application fee" value={f.applicationFee} note="one-time" />
        <Row label="Admission fee" value={f.admissionFee} note="one-time" />
        <Row label="Alumni fee" value={f.alumniFee} note="one-time" />
        <Row label="Examination fee" value={f.examFee} note={examBasisLabel(f.examFeeBasis) || undefined} />
        <Row label="Tuition per semester" value={f.tuitionPerSemester} />
        <Row label="Tuition per year" value={f.tuitionPerYear} />
        <Row label="Tuition — full program" value={f.tuitionTotal} />
      </dl>
      {hasPlans && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[["Semester plan", f.semesterPlanFee, "per semester"], ["Annual plan", f.annualPlanFee, "per year"], ["Full / one-time plan", f.fullPlanFee, "total"]].map(([l, v, n]) =>
            typeof v === "number" ? (
              <div key={l as string} className="rounded-lg bg-mist p-3">
                <p className="text-xs text-gray-600">{l as string}</p>
                <p className="font-semibold text-navy" style={{ fontVariantNumeric: "tabular-nums" }}>{inr(v)}</p>
                <p className="text-xs text-gray-500">{n as string}</p>
              </div>
            ) : null,
          )}
        </div>
      )}
      {inst && inst.length > 0 && (
        <p className="mt-3 text-sm text-gray-700">
          Payable in instalments: {inst.map((x, i) => `${f.durationYears && inst.length === f.durationYears ? `Year ${i + 1}` : `Sem ${i + 1}`} ${inr(x)}`).join(", ")}.
        </p>
      )}
      {f.scholarshipTotalFee && <p className="mt-2 text-sm text-gray-700">Scholarship / discounted fee: <span className="font-semibold text-navy">{inr(f.scholarshipTotalFee)}</span></p>}
      {f.notes && <p className="mt-2 text-xs leading-relaxed text-gray-500">{f.notes}</p>}
    </div>
  );
}
