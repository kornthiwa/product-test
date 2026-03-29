import { api } from "./client";
import type {
  CreateJobRequest,
  JobDetail,
  JobRow,
  PaginatedList,
  PriceQuoteRequest,
  PriceQuoteResponse,
  ProductRow,
  RuleRow,
} from "./types";

export type ListParams = {
  page?: number;
  pageSize?: number;
};

function normalizePaginatedList<T>(
  raw: unknown,
  fallback: { page: number; pageSize: number },
): PaginatedList<T> {
  if (!raw || typeof raw !== "object") {
    return { ...fallback, total: 0, data: [] };
  }
  const o = raw as Record<string, unknown>;
  const page = typeof o.page === "number" ? o.page : fallback.page;
  const pageSize =
    typeof o.pageSize === "number" ? o.pageSize : fallback.pageSize;
  const total = typeof o.total === "number" ? o.total : 0;
  const rows = o.data ?? o.items;
  const data = Array.isArray(rows) ? (rows as T[]) : [];
  return { page, pageSize, total, data };
}

/** path ไม่มี leading slash — รวมกับ baseURL `/api/nest` ได้ `/api/nest/jobs` */
export async function fetchJobsList(
  params: ListParams = {},
): Promise<PaginatedList<JobRow>> {
  const { data } = await api.get<unknown>("jobs", { params });
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  return normalizePaginatedList<JobRow>(data, { page, pageSize });
}

export async function fetchProductsList(
  params: ListParams = {},
): Promise<PaginatedList<ProductRow>> {
  const { data } = await api.get<unknown>("products", { params });
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  return normalizePaginatedList<ProductRow>(data, { page, pageSize });
}

export async function fetchRulesList(
  params: ListParams = {},
): Promise<PaginatedList<RuleRow>> {
  const { data } = await api.get<unknown>("rules", { params });
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  return normalizePaginatedList<RuleRow>(data, { page, pageSize });
}

export async function postPriceQuote(
  body: PriceQuoteRequest,
): Promise<PriceQuoteResponse> {
  const { data } = await api.post<PriceQuoteResponse>("quotes/price", body);
  return data;
}

export async function fetchJobById(jobId: number): Promise<JobDetail> {
  const { data } = await api.get<JobDetail>(`jobs/${jobId}`);
  return data;
}

export async function postCreateJob(
  body: CreateJobRequest,
): Promise<JobDetail> {
  const { data } = await api.post<JobDetail>("jobs", body);
  return data;
}
