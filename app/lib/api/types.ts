export type PaginatedList<T> = {
  page: number;
  pageSize: number;
  total: number;
  data: T[];
};

export type JobRow = {
  jobId: number;
  status: string;
  distanceKm?: number;
  is_active: boolean;
  items?: { index: number; productId: string; quantity: number; status: string }[];
};

export type ProductRow = {
  id: string;
  name: string;
  price: number;
  weight: number;
  is_active: boolean;
};

export type RuleRow = {
  id: number;
  type: string;
  method: string;
  type_value: string;
  value: number;
  priority: number;
  effective_from: string;
  effective_to: string;
  is_active: boolean;
};

/** POST /quotes/price */
export type PriceQuoteLineInput = {
  productId: string;
  quantity: number;
  distanceKm?: number;
};

export type PriceQuoteRequest = {
  items: PriceQuoteLineInput[];
  quoteAt?: string;
};

export type PriceQuoteLineResult = {
  productId: string;
  quantity: number;
  basePrice: number;
  finalPrice: number;
  appliedRules: number[];
};

export type PriceQuoteResponse = {
  quoteAt: string;
  summaryPrice: number;
  items: PriceQuoteLineResult[];
};

/** GET /jobs/:jobId */
export type JobItemDetail = {
  index: number;
  productId: string;
  quantity: number;
  status: string;
  finalPrice?: number;
  appliedRules?: number[];
};

export type JobDetail = {
  jobId: number;
  status: string;
  distanceKm?: number;
  items: JobItemDetail[];
  is_active: boolean;
};

/** POST /jobs */
export type CreateJobItemRequest = {
  productId: string;
  quantity: number;
};

export type CreateJobRequest = {
  items: CreateJobItemRequest[];
  distanceKm?: number;
  is_active?: boolean;
};
