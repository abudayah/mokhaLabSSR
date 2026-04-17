import { CurrencyProvider } from "@/contexts/currency-context"

/**
 * Wraps all /products/* pages with CurrencyProvider.
 * Kept at this level so the homepage and blog don't pay the cost
 * of the IP geolocation fetch.
 */
export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <CurrencyProvider>{children}</CurrencyProvider>
}
