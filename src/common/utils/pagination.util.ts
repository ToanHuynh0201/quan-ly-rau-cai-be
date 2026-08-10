export function paginationMeta(total: number, page: number, limit: number) {
  return { total, page, limit, totalPage: Math.ceil(total / limit) };
}

export function paginationSkip(page: number, limit: number) {
  return (page - 1) * limit;
}
