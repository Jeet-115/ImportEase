import XLSX from "xlsx-js-style";

const MONTH_MAP = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const pad2 = (value) => String(value).padStart(2, "0");

const expandYear = (yearValue) => {
  const year = Number(yearValue);
  if (!Number.isFinite(year)) return null;
  if (year >= 1000) return year;
  if (year >= 70) return 1900 + year;
  return 2000 + year;
};

const toDdMmYyyy = (day, month, year) => {
  const d = Number(day);
  const m = Number(month);
  const y = expandYear(year);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !y) return null;
  if (d < 1 || d > 31 || m < 1 || m > 12) return null;
  return `${pad2(d)}/${pad2(m)}/${y}`;
};

const parseMonthName = (value) => {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 3);
  return MONTH_MAP[key] ?? MONTH_MAP[String(value || "").trim().toLowerCase()] ?? null;
};

const parseStringDate = (raw) => {
  const text = String(raw).trim();
  if (!text) return null;

  const monthNameMatch = text.match(
    /^(\d{1,2})[-\s/]([A-Za-z]{3,9})[-\s/](\d{2,4})$/,
  );
  if (monthNameMatch) {
    const month = parseMonthName(monthNameMatch[2]);
    if (month) {
      return toDdMmYyyy(monthNameMatch[1], month, monthNameMatch[3]);
    }
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = slashMatch[3];

    if (first > 12 && second <= 12) {
      return toDdMmYyyy(first, second, year);
    }
    if (second > 12 && first <= 12) {
      return toDdMmYyyy(second, first, year);
    }

    return toDdMmYyyy(first, second, year);
  }

  const dashNumericMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dashNumericMatch) {
    return toDdMmYyyy(
      dashNumericMatch[1],
      dashNumericMatch[2],
      dashNumericMatch[3],
    );
  }

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return toDdMmYyyy(isoMatch[3], isoMatch[2], isoMatch[1]);
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return toDdMmYyyy(
      parsed.getDate(),
      parsed.getMonth() + 1,
      parsed.getFullYear(),
    );
  }

  return null;
};

export const formatSalesDisplayDate = (value) => {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return toDdMmYyyy(parsed.d, parsed.m, parsed.y);
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toDdMmYyyy(
      value.getDate(),
      value.getMonth() + 1,
      value.getFullYear(),
    );
  }

  return parseStringDate(value);
};
