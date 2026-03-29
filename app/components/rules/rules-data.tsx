"use client";

import { useQuery } from "@tanstack/react-query";
import { PaginationBar } from "@/components/pagination-bar/pagination-bar";
import { fetchRulesList } from "@/lib/api/fetchers";
import { getAxiosErrorMessage } from "@/lib/api/error-message";
import { useListPaginationParams } from "@/lib/hooks/use-list-pagination-params";
import { queryKeys } from "@/lib/query-keys";

export function RulesData() {
  const { page, pageSize, setPage, setPageSize } = useListPaginationParams();
  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: queryKeys.rules.list({ page, pageSize }),
    queryFn: () => fetchRulesList({ page, pageSize }),
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
      </div>
    );
  }

  return (
    <div className="mt-6">
      {isFetching && !isPending ? (
        <p className="mb-2 text-xs text-zinc-500">อัปเดตข้อมูล…</p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              <th className="px-3 py-3 font-medium text-foreground">id</th>
              <th className="px-3 py-3 font-medium text-foreground">type</th>
              <th className="px-3 py-3 font-medium text-foreground">method</th>
              <th className="px-3 py-3 font-medium text-foreground">value</th>
              <th className="px-3 py-3 font-medium text-foreground">
                priority
              </th>
              <th className="px-3 py-3 font-medium text-foreground">ใช้งาน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  ไม่มีข้อมูล
                </td>
              </tr>
            ) : (
              data.data.map((row) => (
                <tr key={row.id} className="bg-white dark:bg-black/40">
                  <td className="px-3 py-3 font-mono text-foreground">
                    {row.id}
                  </td>
                  <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">
                    {row.type}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.method}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.value}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.priority}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400">
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
        total={data.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
