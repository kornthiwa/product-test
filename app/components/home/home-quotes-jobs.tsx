"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchJobById,
  fetchJobsList,
  fetchProductsList,
  postCreateJob,
  postPriceQuote,
} from "@/lib/api/fetchers";
import { getAxiosErrorMessage } from "@/lib/api/error-message";
import { queryKeys } from "@/lib/query-keys";
import type { PriceQuoteLineInput } from "@/lib/api/types";

const emptyLine = (): PriceQuoteLineInput => ({
  productId: "",
  quantity: 1,
});

type CreateJobLine = { productId: string; quantity: number };

const emptyCreateLine = (): CreateJobLine => ({ productId: "", quantity: 1 });

const PRODUCTS_PAGE_SIZE = 1000;
const JOBS_PAGE_SIZE = 1000;

export function HomeQuotesJobs() {
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<PriceQuoteLineInput[]>([emptyLine()]);
  const [quoteAt, setQuoteAt] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [createLines, setCreateLines] = useState<CreateJobLine[]>([
    emptyCreateLine(),
  ]);
  const [createJobDistanceKm, setCreateJobDistanceKm] = useState("");

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({
      page: 1,
      pageSize: PRODUCTS_PAGE_SIZE,
    }),
    queryFn: () => fetchProductsList({ page: 1, pageSize: PRODUCTS_PAGE_SIZE }),
  });

  const productOptions =
    productsQuery.data?.data.filter((p) => p.is_active) ?? [];

  const jobsQuery = useQuery({
    queryKey: queryKeys.jobs.list({ page: 1, pageSize: JOBS_PAGE_SIZE }),
    queryFn: () => fetchJobsList({ page: 1, pageSize: JOBS_PAGE_SIZE }),
  });

  const jobOptions = [...(jobsQuery.data?.data ?? [])].sort(
    (a, b) => a.jobId - b.jobId,
  );

  const priceMutation = useMutation({
    mutationFn: postPriceQuote,
  });

  const jobMutation = useMutation({
    mutationFn: fetchJobById,
  });

  const createJobMutation = useMutation({
    mutationFn: postCreateJob,
    onSuccess: (job) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      setSelectedJobId(String(job.jobId));
      jobMutation.mutate(job.jobId);
    },
  });

  function updateCreateLine(
    index: number,
    patch: Partial<CreateJobLine>,
  ): void {
    setCreateLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addCreateLine(): void {
    setCreateLines((prev) => [...prev, emptyCreateLine()]);
  }

  function removeCreateLine(index: number): void {
    setCreateLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  function updateLine(
    index: number,
    patch: Partial<PriceQuoteLineInput>,
  ): void {
    setLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addLine(): void {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number): void {
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  function handlePriceSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const items: PriceQuoteLineInput[] = lines
      .map((l) => {
        const productId = l.productId.trim();
        const quantity = Number(l.quantity);
        const row: PriceQuoteLineInput = { productId, quantity };
        if (
          l.distanceKm != null &&
          Number.isFinite(l.distanceKm) &&
          l.distanceKm >= 0
        ) {
          row.distanceKm = l.distanceKm;
        }
        return row;
      })
      .filter(
        (l) =>
          l.productId.length > 0 &&
          Number.isFinite(l.quantity) &&
          l.quantity >= 1,
      );

    if (items.length === 0) {
      return;
    }

    priceMutation.mutate({
      items,
      ...(quoteAt.trim() ? { quoteAt: new Date(quoteAt).toISOString() } : {}),
    });
  }

  function handleJobFetch(e: React.FormEvent): void {
    e.preventDefault();
    const id = Number(selectedJobId);
    if (!Number.isInteger(id) || id < 0) {
      return;
    }
    jobMutation.mutate(id);
  }

  function handleCreateJobSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const items = createLines
      .map((l) => ({
        productId: l.productId.trim(),
        quantity: Number(l.quantity),
      }))
      .filter(
        (l) =>
          l.productId.length > 0 &&
          Number.isFinite(l.quantity) &&
          l.quantity >= 1,
      );

    if (items.length === 0) {
      return;
    }

    const kmRaw = createJobDistanceKm.trim();
    const km = kmRaw === "" ? undefined : Number(kmRaw);
    if (km != null && (!Number.isFinite(km) || km < 0)) {
      return;
    }

    createJobMutation.mutate({
      items,
      ...(km != null ? { distanceKm: km } : {}),
    });
  }

  const quoteResult = priceMutation.data;
  const jobResult = jobMutation.data;

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-2">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
        <h2 className="text-lg font-semibold text-foreground">คำนวณราคา</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
            POST /quotes/price
          </code>
        </p>
        <form onSubmit={handlePriceSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="quoteAt"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              เวลาอ้างอิง (ไม่บังคับ)
            </label>
            <input
              id="quoteAt"
              type="datetime-local"
              value={quoteAt}
              onChange={(e) => setQuoteAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-foreground shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-black"
            />
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                รายการสินค้า (เลือกได้หลายรายการ — กดเพิ่มรายการ)
              </p>
              {productsQuery.isSuccess &&
              (productsQuery.data?.total ?? 0) >
                (productsQuery.data?.data?.length ?? 0) ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  โหลด {productsQuery.data?.data.length ?? 0} รายการต่อหน้า —
                  ในระบบมีทั้งหมด {productsQuery.data?.total} รายการ
                </p>
              ) : null}
            </div>
            {productsQuery.isPending ? (
              <p className="text-sm text-zinc-500">กำลังโหลดรายการสินค้า…</p>
            ) : null}
            {productsQuery.isError ? (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                role="alert"
              >
                {getAxiosErrorMessage(productsQuery.error)}
              </div>
            ) : null}
            {productsQuery.isSuccess && productOptions.length === 0 ? (
              <p className="text-sm text-amber-800 dark:text-amber-300">
                ไม่มีสินค้าที่เปิดใช้งาน — ตรวจสอบหน้า Products หรือซิงก์ข้อมูล
              </p>
            ) : null}
            {lines.map((line, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="min-w-0 flex-1 sm:min-w-[14rem]">
                  <label
                    htmlFor={`pid-${index}`}
                    className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    สินค้า
                  </label>
                  <select
                    id={`pid-${index}`}
                    value={line.productId}
                    onChange={(e) =>
                      updateLine(index, { productId: e.target.value })
                    }
                    disabled={
                      productsQuery.isPending || productOptions.length === 0
                    }
                    className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black disabled:opacity-60"
                  >
                    <option value="">— เลือกสินค้า —</option>
                    {productOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} · {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label
                    htmlFor={`qty-${index}`}
                    className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    จำนวน
                  </label>
                  <input
                    id={`qty-${index}`}
                    type="number"
                    min={1}
                    placeholder="qty"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(index, {
                        quantity: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
                  />
                </div>
                <div className="w-28">
                  <label
                    htmlFor={`km-${index}`}
                    className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    ระยะ (km)
                  </label>
                  <input
                    id={`km-${index}`}
                    type="number"
                    min={0}
                    step="any"
                    placeholder="distanceKm"
                    value={line.distanceKm ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateLine(
                        index,
                        v === ""
                          ? { distanceKm: undefined }
                          : { distanceKm: Number(v) },
                      );
                    }}
                    className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
                  />
                </div>
                {lines.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    ลบ
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addLine}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              เพิ่มรายการ
            </button>
            <button
              type="submit"
              disabled={
                priceMutation.isPending ||
                productsQuery.isPending ||
                productOptions.length === 0
              }
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {priceMutation.isPending ? "กำลังคำนวณ…" : "คำนวณราคา"}
            </button>
          </div>
        </form>
        {priceMutation.isError ? (
          <div
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {getAxiosErrorMessage(priceMutation.error)}
          </div>
        ) : null}
        {quoteResult ? (
          <div className="mt-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              quoteAt:{" "}
              <span className="font-mono text-foreground">
                {quoteResult.quoteAt}
              </span>
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              รวม: {quoteResult.summaryPrice.toLocaleString()}
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <tr>
                    <th className="px-3 py-2">สินค้า</th>
                    <th className="px-3 py-2">จำนวน</th>
                    <th className="px-3 py-2">ราคาฐาน</th>
                    <th className="px-3 py-2">ราคาสุดท้าย</th>
                    <th className="px-3 py-2">กฎที่ใช้</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {quoteResult.items.map((row, i) => (
                    <tr key={`${row.productId}-${i}`}>
                      <td className="px-3 py-2 font-mono">{row.productId}</td>
                      <td className="px-3 py-2">{row.quantity}</td>
                      <td className="px-3 py-2">{row.basePrice}</td>
                      <td className="px-3 py-2 font-medium">
                        {row.finalPrice}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        [{row.appliedRules.join(", ")}]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex flex-col gap-10">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
          <h2 className="text-lg font-semibold text-foreground">สร้างงาน</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
              POST /jobs
            </code>{" "}
            — คิดราคาตามกฎ ณ เวลาสร้าง และได้{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
              jobId
            </code>{" "}
            ใหม่
          </p>
          <form onSubmit={handleCreateJobSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="createJobDistanceKm"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                ระยะทางทั้งงาน (km, ไม่บังคับ)
              </label>
              <input
                id="createJobDistanceKm"
                type="number"
                min={0}
                step="any"
                placeholder="ใช้กับกฎระยะทาง"
                value={createJobDistanceKm}
                onChange={(e) => setCreateJobDistanceKm(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-black"
              />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                รายการสินค้าในงาน
              </p>
              {productsQuery.isPending ? (
                <p className="text-sm text-zinc-500">กำลังโหลดรายการสินค้า…</p>
              ) : null}
              {createLines.map((line, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:flex-row sm:flex-wrap sm:items-end"
                >
                  <div className="min-w-0 flex-1 sm:min-w-[14rem]">
                    <label
                      htmlFor={`create-pid-${index}`}
                      className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                    >
                      สินค้า
                    </label>
                    <select
                      id={`create-pid-${index}`}
                      value={line.productId}
                      onChange={(e) =>
                        updateCreateLine(index, { productId: e.target.value })
                      }
                      disabled={
                        productsQuery.isPending || productOptions.length === 0
                      }
                      className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black disabled:opacity-60"
                    >
                      <option value="">— เลือกสินค้า —</option>
                      {productOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} · {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label
                      htmlFor={`create-qty-${index}`}
                      className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                    >
                      จำนวน
                    </label>
                    <input
                      id={`create-qty-${index}`}
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateCreateLine(index, {
                          quantity: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
                    />
                  </div>
                  {createLines.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeCreateLine(index)}
                      className="rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      ลบ
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addCreateLine}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                เพิ่มรายการ
              </button>
              <button
                type="submit"
                disabled={
                  createJobMutation.isPending ||
                  productsQuery.isPending ||
                  productOptions.length === 0
                }
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {createJobMutation.isPending ? "กำลังสร้าง…" : "สร้างงาน"}
              </button>
            </div>
          </form>
          {createJobMutation.isError ? (
            <div
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {getAxiosErrorMessage(createJobMutation.error)}
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
          <h2 className="text-lg font-semibold text-foreground">
            ดูงานตาม jobId
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
              GET /jobs/&#123;job_id&#125;
            </code>
          </p>
          <form onSubmit={handleJobFetch} className="mt-6 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                รายการจาก{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
                  GET /jobs
                </code>
              </p>
              {jobsQuery.isSuccess &&
              (jobsQuery.data?.total ?? 0) >
                (jobsQuery.data?.data?.length ?? 0) ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  โหลด {jobsQuery.data?.data.length ?? 0} รายการต่อหน้า —
                  ในระบบมีทั้งหมด {jobsQuery.data?.total} งาน
                </p>
              ) : null}
            </div>
            {jobsQuery.isPending ? (
              <p className="text-sm text-zinc-500">กำลังโหลดรายการงาน…</p>
            ) : null}
            {jobsQuery.isError ? (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                role="alert"
              >
                {getAxiosErrorMessage(jobsQuery.error)}
              </div>
            ) : null}
            {jobsQuery.isSuccess && jobOptions.length === 0 ? (
              <p className="text-sm text-amber-800 dark:text-amber-300">
                ไม่มีงานในระบบ — ตรวจสอบหน้า Jobs หรือซิงก์ข้อมูล
              </p>
            ) : null}
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[12rem] flex-1 sm:min-w-[18rem]">
                <label
                  htmlFor="jobId"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  เลือกงาน (jobId)
                </label>
                <select
                  id="jobId"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  disabled={jobsQuery.isPending || jobOptions.length === 0}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-black disabled:opacity-60"
                >
                  <option value="">— เลือกงาน —</option>
                  {jobOptions.map((job) => (
                    <option key={job.jobId} value={String(job.jobId)}>
                      {job.jobId} · {job.status} · {job.items?.length ?? 0}{" "}
                      รายการ
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={
                  jobMutation.isPending ||
                  jobsQuery.isPending ||
                  jobOptions.length === 0 ||
                  selectedJobId === ""
                }
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {jobMutation.isPending ? "กำลังโหลด…" : "โหลดงาน"}
              </button>
            </div>
          </form>
          {jobMutation.isError ? (
            <div
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {getAxiosErrorMessage(jobMutation.error)}
            </div>
          ) : null}
          {jobResult ? (
            <div className="mt-6 space-y-3 text-sm">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <dt className="text-zinc-500">jobId</dt>
                <dd className="font-mono text-foreground">{jobResult.jobId}</dd>
                <dt className="text-zinc-500">สถานะ</dt>
                <dd className="text-foreground">{jobResult.status}</dd>
                <dt className="text-zinc-500">ระยะทาง</dt>
                <dd className="text-foreground">
                  {jobResult.distanceKm ?? "—"}
                </dd>
                <dt className="text-zinc-500">ใช้งาน</dt>
                <dd className="text-foreground">
                  {jobResult.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                </dd>
              </dl>
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full min-w-[24rem] text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">สินค้า</th>
                      <th className="px-3 py-2">จำนวน</th>
                      <th className="px-3 py-2">สถานะรายการ</th>
                      <th className="px-3 py-2">ราคา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {(jobResult.items ?? []).map((it) => (
                      <tr key={it.index}>
                        <td className="px-3 py-2">{it.index}</td>
                        <td className="px-3 py-2 font-mono">{it.productId}</td>
                        <td className="px-3 py-2">{it.quantity}</td>
                        <td className="px-3 py-2">{it.status}</td>
                        <td className="px-3 py-2">
                          {it.finalPrice != null ? it.finalPrice : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
