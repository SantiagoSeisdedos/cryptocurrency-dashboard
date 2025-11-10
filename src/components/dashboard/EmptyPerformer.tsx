import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function EmptyPerformer({
  placeholder,
  positive = false,
}: {
  placeholder: string;
  positive?: boolean;
}) {
  return (
    <div
      className={`flex flex-1 items-center gap-3 rounded-xl px-4 py-3 ${
        positive ? "bg-emerald-500/5" : "bg-rose-500/5"
      }`}
    >
      {positive ? (
        <ArrowUpRight className="h-5 w-5 text-emerald-200" />
      ) : (
        <ArrowDownRight className="h-5 w-5 text-rose-200" />
      )}
      <div>
        <p className="text-sm font-semibold text-white">{placeholder}</p>
        <p className="text-xs font-medium text-slate-400">No data</p>
      </div>
    </div>
  );
}
