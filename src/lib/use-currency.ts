"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client";
import { currencySymbol } from "@/lib/constants";

const CACHE_KEY = "fp_currency";

/** Module-level cache so the symbol survives route changes without refetching. */
let cachedCode: string | null = null;

function readInitial(): string {
  if (cachedCode) return cachedCode;
  try {
    cachedCode = sessionStorage.getItem(CACHE_KEY);
  } catch {
    // private mode / blocked storage — fall through to fetch
  }
  return cachedCode ?? "";
}

/**
 * Resolve the signed-in user's display currency (e.g. "GHS" -> "₵").
 * Fetches /api/settings once, caches in sessionStorage, and re-fetches when
 * the Settings page saves a new currency (dispatched via "fp-currency-changed").
 */
export function useCurrencySymbol(): string {
  const [code, setCode] = useState(readInitial);

  useEffect(() => {
    let active = true;

    function fetchCurrency() {
      apiGet<{ currency: string }>("/api/settings")
        .then((d) => {
          if (!active) return;
          cachedCode = d.currency;
          try {
            sessionStorage.setItem(CACHE_KEY, d.currency);
          } catch {
            // storage unavailable — module cache still applies
          }
          setCode(d.currency);
        })
        .catch(() => {
          // leave the previous symbol in place; a refresh will retry
        });
    }

    function onCurrencyChanged() {
      cachedCode = null;
      try {
        sessionStorage.removeItem(CACHE_KEY);
      } catch {
        // ignore
      }
      fetchCurrency();
    }

    window.addEventListener("fp-currency-changed", onCurrencyChanged);
    fetchCurrency();

    return () => {
      active = false;
      window.removeEventListener("fp-currency-changed", onCurrencyChanged);
    };
  }, []);

  return currencySymbol(code || "USD");
}
