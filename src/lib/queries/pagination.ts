export interface PaginatedResult<T> {
  data: T[];
  count: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
}

export const DEFAULT_PAGE_SIZE = 20;

/** Convert page number + page size to Supabase `.range(from, to)` params. */
export function toRange(page: number, pageSize: number): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}
