import { ok, fail, serverError, requireUser } from "@/lib/api";
import { fetchStockPrice } from "@/lib/stocks";

/** GET /api/investments/quote?symbol=AAPL — live stock price lookup. */
export async function GET(req: Request) {
  const { error } = await requireUser();
  if (error) return error;

  try {
    const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase();
    if (!symbol) return fail("Missing symbol.");
    const price = await fetchStockPrice(symbol);
    if (price === null) return fail(`No live price available for ${symbol}.`);
    return ok({ symbol, price });
  } catch (err) {
    return serverError("stock quote", err);
  }
}
