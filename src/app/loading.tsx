import LoadingSpinner from "@/components/LoadingSpinner";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto flex max-w-5xl flex-1 flex-col gap-8 px-4 py-16">
        <LoadingSpinner />
      </div>
    </main>
  );
}

