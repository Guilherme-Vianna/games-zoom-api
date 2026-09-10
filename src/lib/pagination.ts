/** Paginacao por numero de pagina (offset). Puro e testavel. */

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;

export type PageParams = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function toInt(value: unknown, fallback: number): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/** Le `page`/`pageSize` de um objeto de query (ex.: Object.fromEntries(searchParams)). */
export function parsePageParams(query: {
  page?: unknown;
  pageSize?: unknown;
}): PageParams {
  const page = Math.max(1, toInt(query.page, 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, toInt(query.pageSize, DEFAULT_PAGE_SIZE)),
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPageMeta(total: number, page: number, pageSize: number): PageMeta {
  const totalPages = total <= 0 ? 0 : Math.ceil(total / pageSize);
  return { page, pageSize, total, totalPages };
}
