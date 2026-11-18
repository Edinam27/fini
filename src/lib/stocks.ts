/** Normalizes Yahoo's currency codes ("GBp", "ZAc") to ISO codes. */
function normalizeYahooCurrency(code: string | undefined | null): string | null {
  if (!code) return null;
  const map: Record<string, string> = { GBp: "GBP", ZAc: "ZAR", ILA: "ILS" };
  const upper = code.toUpperCase();
  return map[upper] ?? upper;
}

/** Live quote from Yahoo Finance's public chart API (yfinance equivalent). */
export async function fetchStockMeta(
  symbol: string
): Promise<{ price: number | null; currency: string | null }> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?range=1d&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
    );
    if (!res.ok) return { price: null, currency: null };
    const json: unknown = await res.json();
    const first = (json as { chart?: { result?: unknown[] } }).chart?.result?.[0];
    if (typeof first !== "object" || first === null) return { price: null, currency: null };
    const result = first as {
      meta?: { currency?: string };
      indicators?: { quote?: { close?: (number | null)[] }[] };
    };
    const closes = (result.indicators?.quote?.[0]?.close ?? []).filter(
      (v): v is number => typeof v === "number"
    );
    return {
      price: closes.length > 0 ? closes[closes.length - 1] : null,
      currency: normalizeYahooCurrency(result.meta?.currency),
    };
  } catch {
    return { price: null, currency: null };
  }
}

export async function fetchStockPrice(symbol: string): Promise<number | null> {
  return (await fetchStockMeta(symbol)).price;
}
