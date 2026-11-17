"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  TrendingUp,
  Activity,
  Sigma,
  Search,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { StatCard } from "@/components/stat-card";
import { apiGet, apiSend } from "@/lib/client";
import { currencySymbol, INVESTMENT_TYPES, TBILL_TENURES, BOND_TYPES } from "@/lib/constants";
import { formatMoney, formatPercent, formatDate } from "@/lib/format";

interface Holding {
  id: number;
  symbol: string;
  quantity: string;
  purchase_price: string;
  purchase_date: string;
  portfolio_type: string;
  currentPrice: number;
  value: number;
  positionReturn: number;
}

interface PortfolioData {
  holdings: Holding[];
  totalValue: number;
  totalCost: number;
  portfolioReturn: number;
  portfolioRisk: number;
  sharpeRatio: number;
}

const TYPE_LABELS: Record<string, string> = {
  stock: "Stock",
  company_share: "Company Shares",
  treasury_bill: "Treasury Bill",
  bond: "Bond",
};

export default function InvestmentsPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [invType, setInvType] = useState<string>("Stocks");
  const [symbol, setSymbol] = useState("");
  const [quote, setQuote] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [profitability, setProfitability] = useState("");
  const [tenure, setTenure] = useState<string>(TBILL_TENURES[0]);
  const [tbillAmount, setTbillAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [bondType, setBondType] = useState<string>(BOND_TYPES[0]);
  const [bondName, setBondName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [couponRate, setCouponRate] = useState("");
  const [maturityYears, setMaturityYears] = useState("10");

  async function load() {
    setLoading(true);
    try {
      setData(await apiGet<PortfolioData>("/api/investments"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    apiGet<PortfolioData>("/api/investments")
      .then((d) => {
        if (!active) return;
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Load failed");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function lookupQuote() {
    if (!symbol.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/investments/quote?symbol=${encodeURIComponent(symbol.trim().toUpperCase())}`);
      const json = await res.json();
      setQuote(json.success ? json.data.price : null);
      if (json.success && json.data.price) setPrice(String(json.data.price.toFixed(2)));
      else setError(`Could not fetch a live price for ${symbol.toUpperCase()}.`);
    } catch {
      setError("Quote lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addInvestment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      let payload: Record<string, unknown> | null = null;
      if (invType === "Stocks") {
        if (!symbol.trim() || Number(quantity) <= 0) throw new Error("Enter a stock symbol and quantity.");
        payload = {
          portfolio_type: "stock",
          symbol: symbol.trim().toUpperCase(),
          quantity: Number(quantity),
          purchase_price: Number(price || 0),
        };
      } else if (invType === "Company Shares") {
        if (!symbol.trim() || Number(quantity) <= 0 || Number(price) <= 0)
          throw new Error("Enter company name, share price and quantity.");
        payload = {
          portfolio_type: "company_share",
          symbol: symbol.trim(),
          quantity: Number(quantity),
          purchase_price: Number(price),
        };
        void profitability;
      } else if (invType === "Treasury Bills") {
        if (Number(tbillAmount) <= 0) throw new Error("Enter an investment amount.");
        payload = {
          portfolio_type: "treasury_bill",
          symbol: `T-Bill ${tenure}`,
          quantity: 1,
          purchase_price: Number(tbillAmount),
        };
        void interestRate;
        void maturityDate;
      } else {
        if (!bondName.trim() || Number(principal) <= 0)
          throw new Error("Enter bond name and principal amount.");
        payload = {
          portfolio_type: "bond",
          symbol: `${bondType} Bond - ${bondName.trim()}`,
          quantity: 1,
          purchase_price: Number(principal),
        };
        void couponRate;
        void maturityYears;
      }

      await apiSend("/api/investments", "POST", payload);
      setSuccess("Investment added successfully!");
      setSymbol("");
      setQuote(null);
      setQuantity("");
      setPrice("");
      setShowForm(false);
      await load();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await apiSend(`/api/investments?id=${id}`, "DELETE");
      setData((prev) => (prev ? { ...prev, holdings: prev.holdings.filter((h) => h.id !== id) } : prev));
      setSuccess("Investment deleted!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const sym = currencySymbol("USD");

  return (
    <>
      <AppHeader
        title="Investment Portfolio"
        subtitle="Stocks with live prices, plus shares, treasury bills and bonds"
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={18} />
          {showForm ? "Close" : "Add Investment"}
        </button>
      </div>

      {error && <div className="badge badge-red mb-4 w-full justify-start rounded-xl px-4 py-3">{error}</div>}
      {success && <div className="badge badge-green mb-4 w-full justify-start rounded-xl px-4 py-3">{success}</div>}

      {/* Portfolio summary */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Value"
          value={data?.totalValue ?? 0}
          icon={TrendingUp}
          color="#EF4444"
          currencySymbol={sym}
        />
        <StatCard
          label="Return"
          value={(data?.portfolioReturn ?? 0) * 100 > 0
            ? formatPercent((data?.portfolioReturn ?? 0) * 100)
            : `${((data?.portfolioReturn ?? 0) * 100).toFixed(1)}%`}
          icon={Activity}
          color="#10B981"
        />
        <StatCard
          label="Risk (Std Dev)"
          value={`${((data?.portfolioRisk ?? 0) * 100).toFixed(1)}%`}
          icon={Sigma}
          color="#F59E0B"
        />
        <StatCard
          label="Sharpe Ratio"
          value={(data?.sharpeRatio ?? 0).toFixed(2)}
          icon={Sigma}
          color="#3B82F6"
        />
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addInvestment} className="card mt-6 p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {INVESTMENT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`tab ${invType === t ? "active" : ""}`}
                onClick={() => setInvType(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {invType === "Stocks" && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="field-label">Stock Symbol</label>
                <div className="flex gap-2">
                  <input
                    className="input uppercase"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="AAPL"
                  />
                  <button type="button" className="btn btn-ghost shrink-0 px-3" onClick={lookupQuote} title="Get live price">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="field-label">Current Price {quote !== null && "(live)"}</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Fetched automatically if left 0"
                />
              </div>
              <div>
                <label className="field-label">Quantity</label>
                <input className="input" type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>
          )}

          {invType === "Company Shares" && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="field-label">Company Name</label>
                <input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Share Price</label>
                <input className="input" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Number of Shares</label>
                <input className="input" type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Annual Profitability (%)</label>
                <input className="input" type="number" step="0.1" value={profitability} onChange={(e) => setProfitability(e.target.value)} />
              </div>
            </div>
          )}

          {invType === "Treasury Bills" && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="field-label">Tenure</label>
                <select className="input" value={tenure} onChange={(e) => setTenure(e.target.value)}>
                  {TBILL_TENURES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Investment Amount</label>
                <input className="input" type="number" min="0" step="100" value={tbillAmount} onChange={(e) => setTbillAmount(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Interest Rate (%)</label>
                <input className="input" type="number" min="0" max="100" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Maturity Date</label>
                <input className="input" type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
              </div>
            </div>
          )}

          {invType === "Bonds" && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="field-label">Bond Type</label>
                <select className="input" value={bondType} onChange={(e) => setBondType(e.target.value)}>
                  {BOND_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Bond Name / ID</label>
                <input className="input" value={bondName} onChange={(e) => setBondName(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Principal Amount</label>
                <input className="input" type="number" min="0" step="100" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Coupon Rate (%)</label>
                <input className="input" type="number" min="0" max="100" step="0.1" value={couponRate} onChange={(e) => setCouponRate(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Years to Maturity</label>
                <input className="input" type="number" min="1" max="30" value={maturityYears} onChange={(e) => setMaturityYears(e.target.value)} />
              </div>
            </div>
          )}

          <button className="btn btn-primary mt-6" disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            Add {invType === "Stocks" ? "Stock" : invType}
          </button>
        </form>
      )}

      {/* Holdings */}
      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="font-heading text-base font-bold text-[#0F172A]">Current Portfolio</h3>
          <span className="text-sm text-[#64748B]">{data?.holdings.length ?? 0} holdings</span>
        </div>
        <div className="border-t border-[#E2E8F0]">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={20} className="animate-spin text-[#64748B]" />
            </div>
          ) : !data || data.holdings.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#64748B]">
              No investments in portfolio yet.
            </p>
          ) : (
            data.holdings.map((h) => {
              const gain = h.positionReturn >= 0;
              return (
                <div
                  key={h.id}
                  className="flex flex-wrap items-center gap-4 px-6 py-4 transition-all duration-200 hover:bg-[#F8FAFC] not-last:border-b not-last:border-[#E2E8F0]"
                >
                  <span className="badge badge-blue">{TYPE_LABELS[h.portfolio_type] ?? h.portfolio_type}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#0F172A]">{h.symbol}</p>
                    <p className="text-xs text-[#64748B]">
                      {Number(h.quantity)} units · bought {formatDate(h.purchase_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#64748B]">Price</p>
                    <p className="text-sm font-medium text-[#0F172A]">{formatMoney(h.currentPrice, sym)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#64748B]">Value</p>
                    <p className="font-heading text-sm font-bold text-[#0F172A]">{formatMoney(h.value, sym)}</p>
                  </div>
                  <span className={`badge ${gain ? "badge-green" : "badge-red"}`}>
                    {formatPercent(h.positionReturn * 100)}
                  </span>
                  <button
                    onClick={() => remove(h.id)}
                    title="Delete"
                    className="rounded-lg p-2 text-[#94A3B8] transition-all duration-200 hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
