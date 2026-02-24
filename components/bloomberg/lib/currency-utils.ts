// // Currency conversion utilities

// // Exchange rates (in a real app, these would come from an API)
// const EXCHANGE_RATES = {
//   CAD_USD: 1.36, // 1 USD = 1.36 CAD (example rate)
//   EUR_USD: 0.92, // 1 USD = 0.92 EUR
//   GBP_USD: 0.79, // 1 USD = 0.79 GBP
//   JPY_USD: 151.2, // 1 USD = 151.2 JPY
// };

// /**
//  * Convert USD to CAD
//  * @param usdValue Value in USD
//  * @returns Value in CAD
//  */
// export function convertToCAD(usdValue: number): number {
//   return usdValue * EXCHANGE_RATES.CAD_USD;
// }

// /**
//  * Get currency symbol based on currency code
//  * @param currencyCode Currency code (e.g., 'USD', 'CAD')
//  * @returns Currency symbol
//  */
// export function getCurrencySymbol(currencyCode: string): string {
//   const symbols: Record<string, string> = {
//     USD: "$",
//     CAD: "C$",
//     EUR: "€",
//     GBP: "£",
//     JPY: "¥",
//   };

//   return symbols[currencyCode] || currencyCode;
// }

// /**
//  * Format a number as currency
//  * @param value Number value
//  * @param currencyCode Currency code (e.g., 'USD', 'CAD')
//  * @param decimals Number of decimal places
//  * @returns Formatted currency string
//  */
// export function formatCurrency(value: number, currencyCode = "USD", decimals = 2): string {
//   const symbol = getCurrencySymbol(currencyCode);
//   return `${symbol}${value.toFixed(decimals)}`;
// }


// Currency conversion utilities

// Exchange rates (in a real app, these would come from an API)
const EXCHANGE_RATES = {
  CAD_USD: 1.36, // 1 USD = 1.36 CAD (example rate)
  EUR_USD: 0.92,
  GBP_USD: 0.79,
  JPY_USD: 151.2,
};

/**
 * Convert USD to CAD
 */
export function convertToCAD(usdValue: number): number {
  if (typeof usdValue !== "number" || !Number.isFinite(usdValue)) {
    return 0;
  }

  return usdValue * EXCHANGE_RATES.CAD_USD;
}

/**
 * Format a number as currency (SAFE VERSION)
 */
export function formatCurrency(
  value: number,
  currencyCode: "USD" | "CAD" | "EUR" | "GBP" | "JPY" = "USD",
  decimals = 2
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format plain numbers (indices / yields / ratios)
 */
export function formatNumber(value: number, decimals = 2): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}