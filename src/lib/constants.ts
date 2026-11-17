export const EXPENSE_CATEGORIES = [
  "Housing",
  "Utilities",
  "Food",
  "Transportation",
  "Entertainment",
  "Savings",
  "Insurance",
  "Others",
] as const;

export const INCOME_CATEGORIES = [
  "Salary",
  "Investments",
  "Business",
  "Freelance",
  "Rental",
  "Other Income",
] as const;

export const INCOME_SOURCES = [
  "Salary",
  "Investments",
  "Side Business",
  "Other",
] as const;

export const PAYMENT_METHODS = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Other",
] as const;

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "GHS"] as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  GHS: "₵",
};

export const BILL_FREQUENCIES = ["Weekly", "Monthly", "Yearly"] as const;

export const INVESTMENT_TYPES = [
  "Stocks",
  "Company Shares",
  "Treasury Bills",
  "Bonds",
] as const;

export const PORTFOLIO_TYPES = [
  "stock",
  "company_share",
  "treasury_bill",
  "bond",
] as const;

export const TBILL_TENURES = ["91 Days", "182 Days", "364 Days"] as const;

export const BOND_TYPES = ["Government", "Corporate"] as const;

export const RISK_PROFILES = ["conservative", "balanced", "aggressive"] as const;

export const LIFE_STAGES = [
  "starting-out",
  "building-wealth",
  "family",
  "pre-retirement",
  "retired",
] as const;

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}
