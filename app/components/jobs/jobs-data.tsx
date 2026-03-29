"use client";

import { useQuery } from "@tanstack/react-query";
import { PaginationBar } from "@/components/pagination-bar/pagination-bar";
import { fetchJobsList } from "@/lib/api/fetchers";
import { getAxiosErrorMessage } from "@/lib/api/error-message";
import { useListPaginationParams } from "@/lib/hooks/use-list-pagination-params";
import { queryKeys } from "@/lib/query-keys";

export function JobsData() {
  const { page, pageSize, setPage, setPageSize } = useListPaginationParams();
  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: queryKeys.jobs.list({ page, pageSize }),
    queryFn: () => fetchJobsList({ page, pageSize }),
  });

  if (isPending) {
    return <p className="mt-6 text-zinc-500 dark:text-zinc-400">กำลังโหลด…</p>;
  }

  if (isError) {
    return (
      <div
        className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        role="alert"
      >
        {getAxiosErrorMessage(error)}
        <p className="mt-2 text-xs opacity-80">
          ตรวจสอบว่า API รันอยู่และตั้งค่า{" "}
          <code className="rounded bg-red-100 px-1 dark:bg-red-900/60">
            NEXT_PUBLIC_API_URL
          </code>{" "}
          ถ้าไม่ได้ใช้พอร์ตเริ่มต้น
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {isFetching && !isPending ? (
        <p className="mb-2 text-xs text-zinc-500">อัปเดตข้อมูล…</p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 font-medium text-foreground">jobId</th>
              <th className="px-4 py-3 font-medium text-foreground">สถานะ</th>
              <th className="px-4 py-3 font-medium text-foreground">รายการ</th>
              <th className="px-4 py-3 font-medium text-foreground">ใช้งาน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {(data?.data?.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  ไม่มีข้อมูล
                </td>
              </tr>
            ) : (
              data.data.map((row) => (
                <tr key={row.jobId} className="bg-white dark:bg-black/40">
                  <td className="px-4 py-3 font-mono text-foreground">
                    {row.jobId}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {row.status}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.items?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
