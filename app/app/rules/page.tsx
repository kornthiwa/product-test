import { RulesData } from "@/components/rules/rules-data";
import { Suspense } from "react";

export default function RulesPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-1 flex-col px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Rules
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        กฎราคาจาก{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-900">
          GET /rules
        </code>{" "}
      </p>
      <Suspense
        fallback={
          <p className="mt-6 text-zinc-500 dark:text-zinc-400">กำลังโหลด…</p>
        }
      >
        <RulesData />
      </Suspense>
    </div>
  );
}
