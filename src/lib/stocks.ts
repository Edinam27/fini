/** Live quote from Yahoo Finance's public chart API (yfinance equivalent). */
export async function fetchStockPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?range=1d&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const json: unknown = await res.json();
    const closes = extractClose(json);
    return closes.length > 0 ? closes[closes.length - 1] : null;
  } catch {
    return null;
  }
}

function extractClose(json: unknown): number[] {
  if (typeof json !== "object" || json === null) return [];
  const result = (json as { chart?: { result?: unknown[] } }).chart?.result;
  const first = result?.[0];
  if (typeof first !== "object" || first === null) return [];
  const closes = (
    first as { indicators?: { quote?: { close?: (number | null)[] }[] } }
  ).indicators?.quote?.[0]?.close;
  return (closes ?? []).filter((v): v is number => typeof v === "number");
}
