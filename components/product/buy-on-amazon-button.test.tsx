import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BuyOnAmazonButton } from "./buy-on-amazon-button"

// ─── Mock useCurrency ─────────────────────────────────────────────────────────

const mockUseCurrency = vi.fn()

vi.mock("@/contexts/currency-context", () => ({
  useCurrency: () => mockUseCurrency(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const US_URL = "https://www.amazon.com/dp/B001US"
const CA_URL = "https://www.amazon.ca/dp/B001CA"

function renderWithCurrency(
  currency: "USD" | "CAD",
  props: Partial<React.ComponentProps<typeof BuyOnAmazonButton>> = {}
) {
  mockUseCurrency.mockReturnValue({ currency, setCurrency: vi.fn() })
  return render(
    <BuyOnAmazonButton
      urls={{ us: US_URL, ca: CA_URL }}
      productName="Espresso WDT Tool"
      {...props}
    />
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("BuyOnAmazonButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.gtag = vi.fn()
  })

  // ── Rendering ───────────────────────────────────────────────────────────────

  describe("rendering", () => {
    it("shows Amazon.com as primary button for USD currency", () => {
      renderWithCurrency("USD")
      expect(screen.getByRole("link", { name: /buy on amazon\.com/i })).toBeInTheDocument()
    })

    it("shows Amazon.ca as primary button for CAD currency", () => {
      renderWithCurrency("CAD")
      expect(screen.getByRole("link", { name: /buy on amazon\.ca/i })).toBeInTheDocument()
    })

    it("shows the alt store link when both URLs are provided", () => {
      renderWithCurrency("USD")
      expect(screen.getByRole("link", { name: /amazon\.ca/i })).toBeInTheDocument()
    })

    it("does not show alt link when only one URL is provided", () => {
      mockUseCurrency.mockReturnValue({ currency: "USD", setCurrency: vi.fn() })
      render(<BuyOnAmazonButton urls={{ us: US_URL }} productName="WDT Tool" />)
      expect(screen.queryByText(/also available on/i)).not.toBeInTheDocument()
    })

    it("renders nothing when no URLs are provided", () => {
      mockUseCurrency.mockReturnValue({ currency: "USD", setCurrency: vi.fn() })
      const { container } = render(<BuyOnAmazonButton urls={{}} />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  // ── URLs ────────────────────────────────────────────────────────────────────

  describe("href values", () => {
    it("primary link points to amazon.com for USD", () => {
      renderWithCurrency("USD")
      const primary = screen.getByRole("link", { name: /buy on amazon\.com/i })
      expect(primary).toHaveAttribute("href", US_URL)
    })

    it("primary link points to amazon.ca for CAD", () => {
      renderWithCurrency("CAD")
      const primary = screen.getByRole("link", { name: /buy on amazon\.ca/i })
      expect(primary).toHaveAttribute("href", CA_URL)
    })

    it("alt link points to amazon.ca when currency is USD", () => {
      renderWithCurrency("USD")
      const alt = screen.getByRole("link", { name: /amazon\.ca/i })
      expect(alt).toHaveAttribute("href", CA_URL)
    })

    it("alt link points to amazon.com when currency is CAD", () => {
      renderWithCurrency("CAD")
      const alt = screen.getByRole("link", { name: /amazon\.com/i })
      expect(alt).toHaveAttribute("href", US_URL)
    })

    it("falls back to US URL when CAD is selected but only US URL exists", () => {
      mockUseCurrency.mockReturnValue({ currency: "CAD", setCurrency: vi.fn() })
      render(<BuyOnAmazonButton urls={{ us: US_URL }} productName="WDT Tool" />)
      const primary = screen.getByRole("link", { name: /buy on amazon\.com/i })
      expect(primary).toHaveAttribute("href", US_URL)
    })
  })

  // ── GA4 tracking ────────────────────────────────────────────────────────────

  describe("GA4 tracking", () => {
    it("fires add_to_cart with correct params when primary button is clicked", async () => {
      renderWithCurrency("USD")
      await userEvent.click(screen.getByRole("link", { name: /buy on amazon\.com/i }))

      expect(window.gtag).toHaveBeenCalledWith("event", "add_to_cart", {
        event_category: "ecommerce",
        event_label: "Espresso WDT Tool",
        store: "us",
        outbound_url: US_URL,
      })
    })

    it("fires add_to_cart with store=ca when CAD primary is clicked", async () => {
      renderWithCurrency("CAD")
      await userEvent.click(screen.getByRole("link", { name: /buy on amazon\.ca/i }))

      expect(window.gtag).toHaveBeenCalledWith("event", "add_to_cart", {
        event_category: "ecommerce",
        event_label: "Espresso WDT Tool",
        store: "ca",
        outbound_url: CA_URL,
      })
    })

    it("fires add_to_cart when the alt store link is clicked", async () => {
      renderWithCurrency("USD")
      await userEvent.click(screen.getByRole("link", { name: /amazon\.ca/i }))

      expect(window.gtag).toHaveBeenCalledWith("event", "add_to_cart", {
        event_category: "ecommerce",
        event_label: "Espresso WDT Tool",
        store: "ca",
        outbound_url: CA_URL,
      })
    })

    it("uses the button label as event_label when productName is not provided", async () => {
      mockUseCurrency.mockReturnValue({ currency: "USD", setCurrency: vi.fn() })
      render(<BuyOnAmazonButton urls={{ us: US_URL, ca: CA_URL }} />)
      await userEvent.click(screen.getByRole("link", { name: /buy on amazon\.com/i }))

      expect(window.gtag).toHaveBeenCalledWith("event", "add_to_cart",
        expect.objectContaining({ event_label: "Buy on Amazon.com" })
      )
    })

    it("does not throw when gtag is not available", async () => {
      window.gtag = undefined
      renderWithCurrency("USD")
      await expect(
        userEvent.click(screen.getByRole("link", { name: /buy on amazon\.com/i }))
      ).resolves.not.toThrow()
    })
  })

  // ── Accessibility ────────────────────────────────────────────────────────────

  describe("accessibility", () => {
    it("opens links in a new tab with rel=noopener", () => {
      renderWithCurrency("USD")
      const primary = screen.getByRole("link", { name: /buy on amazon\.com/i })
      expect(primary).toHaveAttribute("target", "_blank")
      expect(primary).toHaveAttribute("rel", "noopener noreferrer")
    })

    it("renders the shopping bag icon with aria-hidden", () => {
      renderWithCurrency("USD")
      const svg = document.querySelector("svg")
      expect(svg).toHaveAttribute("aria-hidden", "true")
    })
  })
})
