import { HomeQuotesJobs } from "@/components/home/home-quotes-jobs";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-5xl flex-1 flex-col px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        คำนวณราคา สร้างงาน และดูงาน
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        เชื่อมกับ{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-900">
          POST /quotes/price
        </code>
        ,{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-900">
          POST /jobs
        </code>
        ,{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-900">
          GET /jobs/:jobId
        </code>{" "}
      </p>
      <HomeQuotesJobs />
    </div>
  );
}
