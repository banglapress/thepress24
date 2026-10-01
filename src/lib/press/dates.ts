const TZ = "Asia/Dhaka";

const MONTHS_BN = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
] as const;

function dhakaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
}

export function todayStamp(date = new Date()) {
  return dhakaParts(date);
}

export function formatBnLong(date = new Date()) {
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatBnDay(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function monthLabel(year: number, month: number) {
  const yearBn = new Intl.NumberFormat("bn-BD", { useGrouping: false }).format(year);
  return `${MONTHS_BN[month - 1] ?? ""} ${yearBn}`;
}

export function monthStartIso(year: number, month: number) {
  const m = String(month).padStart(2, "0");
  return `${year}-${m}-01T00:00:00+06:00`;
}

export function nextMonthStartIso(year: number, month: number) {
  if (month === 12) return monthStartIso(year + 1, 1);
  return monthStartIso(year, month + 1);
}

export function recentMonths(count = 6, date = new Date()) {
  const { year, month } = dhakaParts(date);
  const list: { year: number; month: number; label: string }[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < count; i += 1) {
    list.push({ year: y, month: m, label: monthLabel(y, m) });
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return list;
}
