// Mirrors client/src/shared.jsx's bucketing logic exactly, so the numbers in
// an exported spreadsheet always match what the app itself shows. Dates are
// plain "YYYY-MM-DD" strings with no timezone attached; everything here is
// pure date-part arithmetic so the result never depends on the server's
// local timezone.

function parseDateParts(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

// granularity: "weekly" | "monthly" | "yearly"
export function periodKey(dateStr, granularity) {
  const { y, m, d } = parseDateParts(dateStr);
  if (granularity === "yearly") return String(y);
  if (granularity === "monthly") return `${y}-${String(m).padStart(2, "0")}`;
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() - utc.getUTCDay());
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(utc.getUTCDate()).padStart(2, "0")}`;
}

export function periodLabel(key, granularity) {
  if (granularity === "yearly") return key;
  if (granularity === "weekly") {
    const { y, m, d } = parseDateParts(key);
    const start = new Date(Date.UTC(y, m - 1, d));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const fmt = (dt) => dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return `${fmt(start)} - ${fmt(end)}, ${end.getUTCFullYear()}`;
  }
  const [y, m] = key.split("-");
  return new Date(Date.UTC(parseInt(y), parseInt(m) - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
