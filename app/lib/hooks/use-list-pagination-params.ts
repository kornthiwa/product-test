"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from "@/lib/pagination/list-params";

function parsePage(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

function parsePageSize(raw: string | null): PageSizeOption {
  const n = Number(raw);
  if (PAGE_SIZE_OPTIONS.includes(n as PageSizeOption)) {
    return n as PageSizeOption;
  }
  return DEFAULT_PAGE_SIZE;
}


export function useListPaginationParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = useMemo(
    () => parsePage(searchParams.get("page")),
    [searchParams],
  );
  const pageSize = useMemo(
    () => parsePageSize(searchParams.get("pageSize")),
    [searchParams],
  );

  const pushQuery = useCallback(
    (nextPage: number, nextPageSize: PageSizeOption) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(nextPage));
      params.set("pageSize", String(nextPageSize));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const setPage = useCallback(
    (p: number) => {
      pushQuery(Math.max(1, p), pageSize);
    },
    [pushQuery, pageSize],
  );

  const setPageSize = useCallback(
    (ps: PageSizeOption) => {
      pushQuery(1, ps);
    },
    [pushQuery],
  );

  return { page, pageSize, setPage, setPageSize };
}
