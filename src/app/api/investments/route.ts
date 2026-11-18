import { z } from "zod";
import { ok, fail, serverError, requireUser, num } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { fetchStockMeta } from "@/lib/stocks";
import { CURRENCIES } from "@/lib/constants";

const RISK_FREE_RATE = 0.02; // same 2% assumption as the original

const investmentSchema = z.object({
  portfolio_type: z.enum(["stock", "company_share", "treasury_bill", "bond"]),
  symbol: z.string().min(1).max(120),
  quantity: z.number().min(0),
  purchase_price: z.number().min(0),
  /** Units the price/value are quoted in. Defaults to the account currency. */
  currency: z.enum(CURRENCIES).optional(),
});

/** GET /api/investments — holdings + performance (return, risk, Sharpe). */
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const [holdings, account] = await Promise.all([
      query<PortfolioRow>(
        `SELECT id, symbol, quantity, purchase_price, purchase_date, portfolio_type, currency
           FROM portfolios WHERE user_id = $1
          ORDER BY purchase_date DESC`,
        [user.id]
      ),
      queryOne<{ currency: string }>("SELECT currency FROM users WHERE id = $1", [user.id]),
    ]);
    const accountCurrency = account?.currency ?? "USD";

    if (holdings.length === 0) {
      return ok({
        holdings: [],
        accountCurrency,
        totalValue: 0,
        totalValueByCurrency: {},
        totalCost: 0,
        portfolioReturn: 0,
        portfolioRisk: 0,
        sharpeRatio: 0,
      });
    }

    // Live prices only for stocks (via Yahoo Finance, like yfinance before).
    const priceCache = new Map<string, { price: number | null; currency: string | null }>();
    const stockSymbols = [
      ...new Set(holdings.filter((h) => h.portfolio_type === "stock").map((h) => h.symbol)),
    ];
    await Promise.all(
      stockSymbols.map(async (sym) => {
        priceCache.set(sym, await fetchStockMeta(sym));
      })
    );

    let totalValue = 0;
    let totalCost = 0;
    const totalValueByCurrency: Record<string, number> = {};
    const returns: number[] = [];
    const enriched = holdings.map((h) => {
      const qty = num(h.quantity);
      const cost = num(h.purchase_price);
      const meta = h.portfolio_type === "stock" ? priceCache.get(h.symbol) : undefined;
      const live = meta?.price ?? null;
      const currentPrice = live ?? cost;

      // Resolve each holding's currency: stored value first; legacy stock rows
      // backfill from Yahoo's listing currency; everything else is the account
      // currency. Stocks backfilled this way are persisted once.
      let currency = h.currency;
      if (!currency && h.portfolio_type === "stock" && meta?.currency) {
        currency = meta.currency;
        void query("UPDATE portfolios SET currency = $1 WHERE id = $2", [currency, h.id]);
      }
      const resolved = currency ?? accountCurrency;

      const value = currentPrice * qty;
      const positionReturn = cost > 0 ? (currentPrice - cost) / cost : 0;
      if (resolved === accountCurrency) {
        totalValue += value;
        totalCost += cost * qty;
      }
      totalValueByCurrency[resolved] = (totalValueByCurrency[resolved] ?? 0) + value;
      returns.push(positionReturn);
      return { ...h, currency: resolved, currentPrice, value, positionReturn };
    });

    const portfolioReturn = mean(returns);
    const portfolioRisk = stdDev(returns);
    const sharpeRatio =
      portfolioRisk > 0 ? (portfolioReturn - RISK_FREE_RATE) / portfolioRisk : 0;

    return ok({
      holdings: enriched,
      accountCurrency,
      totalValue,
      totalValueByCurrency,
      totalCost,
      portfolioReturn,
      portfolioRisk,
      sharpeRatio,
    });
  } catch (err) {
    return serverError("investments", err);
  }
}

/** POST /api/investments — add a holding. */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body: unknown = await req.json();
    const parsed = investmentSchema.safeParse(body);
    if (!parsed.success) return fail("Please check the investment details.");

    const inv = parsed.data;
    let purchasePrice = inv.purchase_price;
    let currency: string | null = inv.currency ?? null;

    // For stocks, snapshot the live price if the caller didn't set one.
    if (inv.portfolio_type === "stock" && purchasePrice === 0) {
      const meta = await fetchStockMeta(inv.symbol.toUpperCase());
      if (meta.price === null) return fail("Could not fetch the stock price. Try again.");
      purchasePrice = meta.price;
      // Default a stock's currency to its listing currency unless the caller chose one.
      if (!currency && meta.currency) currency = meta.currency;
    }

    const created = await queryOne<{ id: number }>(
      `INSERT INTO portfolios (user_id, symbol, quantity, purchase_price, purchase_date, portfolio_type, currency)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6) RETURNING id`,
      [
        user.id,
        inv.portfolio_type === "stock" ? inv.symbol.toUpperCase() : inv.symbol,
        inv.quantity,
        purchasePrice,
        inv.portfolio_type,
        currency,
      ]
    );
    return ok(created);
  } catch (err) {
    return serverError("adding investment", err);
  }
}

/** DELETE /api/investments?id=1 */
export async function DELETE(req: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const id = num(new URL(req.url).searchParams.get("id"));
    if (!id) return fail("Missing investment id.");
    await query("DELETE FROM portfolios WHERE id = $1 AND user_id = $2", [id, user.id]);
    return ok({ deleted: id });
  } catch (err) {
    return serverError("deleting investment", err);
  }
}

/** GET-side helper route: /api/investments?quote=AAPL handled here too. */
export async function HEAD() {
  return new Response(null, { status: 204 });
}

interface PortfolioRow {
  id: number;
  symbol: string;
  quantity: string;
  purchase_price: string;
  purchase_date: string;
  portfolio_type: string;
  currency: string | null;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

