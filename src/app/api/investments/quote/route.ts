import { ok, fail, serverError, requireUser } from "@/lib/api";
import { fetchStockMeta } from "@/lib/stocks";

/** GET /api/investments/quote?symbol=AAPL — live stock price + listing currency. */
export async function GET(req: Request) {
  const { error } = await requireUser();
  if (error) return error;

  try {
    const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase();
    if (!symbol) return fail("Missing symbol.");
    const meta = await fetchStockMeta(symbol);
    if (meta.price === null) return fail(`No live price available for ${symbol}.`);
    return ok({ symbol, price: meta.price, currency: meta.currency });
  } catch (err) {
    return serverError("stock quote", err);
  }
}
