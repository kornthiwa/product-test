"use client";

import type { ReactNode } from "react";
import { getPageTokens } from "@/lib/pagination/get-page-tokens";
import {
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from "@/lib/pagination/list-params";

type PaginationBarProps = {
  page: number;
  pageSize: PageSizeOption;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSizeOption) => void;
};

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const tokens = getPageTokens(page, totalPages);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className="mt-6 flex flex-col gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
      role="navigation"
      aria-label="Pagination"
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          แสดง{" "}
          <span className="font-medium text-foreground">
            {from}–{to}
          </span>{" "}
          จาก {total} รายการ · หน้า {page} / {totalPages}
        </p>
        <label className="flex items-center gap-2">
          <span className="sr-only">จำนวนต่อหน้า</span>
          <span className="text-xs">ต่อหน้า</span>
          <select
            value={pageSize}
            onChange={(e) =>
              onPageSizeChange(Number(e.target.value) as PageSizeOption)
            }
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm font-medium text-foreground dark:border-zinc-700 dark:bg-zinc-900"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
        <PaginationIconButton
          label="หน้าแรก"
          disabled={!canPrev}
          onClick={() => onPageChange(1)}
        >
          «
        </PaginationIconButton>
        <PaginationIconButton
          label="ก่อนหน้า"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </PaginationIconButton>

        <ul className="flex items-center gap-0.5">
          {tokens.map((token, idx) =>
            token === "gap" ? (
              <li
                key={`gap-${idx}`}
                className="px-1.5 text-zinc-400"
                aria-hidden
              >
                …
              </li>
            ) : (
              <li key={token}>
                <button
                  type="button"
                  onClick={() => onPageChange(token)}
                  aria-label={`หน้า ${token}`}
                  aria-current={token === page ? "page" : undefined}
                  className={
                    token === page
                      ? "min-w-9 rounded-md bg-foreground px-2 py-1.5 text-sm font-medium text-background"
                      : "min-w-9 rounded-md px-2 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }
                >
                  {token}
                </button>
              </li>
            ),
          )}
        </ul>

        <PaginationIconButton
          label="ถัดไป"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </PaginationIconButton>
        <PaginationIconButton
          label="หน้าสุดท้าย"
          disabled={!canNext}
          onClick={() => onPageChange(totalPages)}
        >
          »
        </PaginationIconButton>
      </div>
    </div>
  );
}

function PaginationIconButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
      className="min-w-9 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm font-medium text-foreground transition-colors enabled:hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 enabled:dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}
