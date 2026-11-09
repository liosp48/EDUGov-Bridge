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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-2 text-3xl font-bold",
          accent ? accents[accent] : "text-slate-900"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
