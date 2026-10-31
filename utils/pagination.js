const DEFAULT_PAGE_SIZE = 6;
const MAX_PAGE_SIZE = 100;

const parsePositiveInteger = (value) => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const getPagination = ({ page, limit } = {}, defaultPageSize = DEFAULT_PAGE_SIZE) => {
  const currentPage = parsePositiveInteger(page) || 1;
  const requestedLimit = parsePositiveInteger(limit) || defaultPageSize;
  const pageSize = Math.min(requestedLimit, MAX_PAGE_SIZE);

  return { currentPage, limit: pageSize };
};

const getPaginationMetadata = (totalItems, requestedPage, limit) => {
  const normalizedTotal = Math.max(0, Number(totalItems) || 0);
  const totalPages = Math.ceil(normalizedTotal / limit);
  const currentPage = totalPages > 0
    ? Math.min(requestedPage, totalPages)
    : 1;

  return {
    totalItems: normalizedTotal,
    totalPages,
    currentPage,
    limit,
    offset: (currentPage - 1) * limit,
  };
};

module.exports = {
  getPagination,
  getPaginationMetadata,
};
