const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const getDateParts = (value) => {
  if (typeof value !== "string") return null;

  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day, timestamp: date.getTime() };
};

const isValidDateOnly = (value) => getDateParts(value) !== null;

const calculateNights = (checkIn, checkOut) => {
  const start = getDateParts(checkIn);
  const end = getDateParts(checkOut);
  if (!start || !end) return null;

  return Math.round((end.timestamp - start.timestamp) / MILLISECONDS_PER_DAY);
};

const getTodayDateOnly = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
};

const formatDateOnly = (value) => {
  const dateOnly = value instanceof Date
    ? [
        value.getUTCFullYear(),
        String(value.getUTCMonth() + 1).padStart(2, "0"),
        String(value.getUTCDate()).padStart(2, "0"),
      ].join("-")
    : typeof value === "string"
      ? value.slice(0, 10)
      : "";

  if (!isValidDateOnly(dateOnly)) return String(value ?? "");

  return new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC" }).format(
    new Date(`${dateOnly}T00:00:00.000Z`)
  );
};

module.exports = {
  calculateNights,
  formatDateOnly,
  getTodayDateOnly,
  isValidDateOnly,
};
