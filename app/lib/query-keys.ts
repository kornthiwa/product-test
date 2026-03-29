type ListQueryParams = { page: number; pageSize: number };

export const queryKeys = {
  jobs: {
    all: ["jobs"] as const,
    list: (params: ListQueryParams) =>
      [...queryKeys.jobs.all, "list", params] as const,
  },
  products: {
    all: ["products"] as const,
    list: (params: ListQueryParams) =>
      [...queryKeys.products.all, "list", params] as const,
  },
  rules: {
    all: ["rules"] as const,
    list: (params: ListQueryParams) =>
      [...queryKeys.rules.all, "list", params] as const,
  },
};
