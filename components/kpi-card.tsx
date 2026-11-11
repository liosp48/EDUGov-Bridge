import { cn, formatDateFr } from "@/lib/utils";

export default function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "red" | "green" | "blue";
}) {
  const accents = {
    red: "bg-faso-red/10 text-faso-red",
    green: "bg-faso-green/10 text-faso-green",
    blue: "bg-institution/10 text-institution",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-card">
      <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500 leading-tight">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-bold tracking-tight",
          accent ? accents[accent] : "text-slate-900"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] sm:text-xs text-slate-500 leading-snug">{hint}</p>}
    </div>
  );
}
