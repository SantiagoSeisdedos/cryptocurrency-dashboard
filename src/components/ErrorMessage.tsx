import { CircleAlert } from "lucide-react";

interface ErrorMessageProps {
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-rose-500/10 px-6 py-8 text-center text-rose-200">
      <CircleAlert className="h-8 w-8" />
      <p className="max-w-sm text-sm font-medium sm:text-base">{message}</p>
    </div>
  );
}
