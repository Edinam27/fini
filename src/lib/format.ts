export function formatMoney(
  amount: number,
  symbol = "$",
  opts: { compact?: boolean } = {}
): string {
  if (opts.compact && Math.abs(amount) >= 1000) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    const units: Array<[number, string]> = [
      [1_000_000_000, "B"],
      [1_000_000, "M"],
      [1_000, "K"],
    ];
    for (const [size, suffix] of units) {
      if (abs >= size) {
        return `${sign}${symbol}${(abs / size).toFixed(1)}${suffix}`;
      }
    }
  }
  return `${amount < 0 ? "-" : ""}${symbol}${Math.abs(amount).toLocaleString(
    "en-US",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )}`;
}

export function formatPercent(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
