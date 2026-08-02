"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"

interface PrivacyPolicyModalProps {
  onClose: () => void
}

export function PrivacyPolicyModal({ onClose }: PrivacyPolicyModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  // Trap scroll on body
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  // Focus the dialog on mount
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Privacy Policy"
      className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border)] shrink-0">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Privacy Policy</h2>
          <button
            onClick={onClose}
            aria-label="Close privacy policy"
            className="rounded-lg p-1.5 hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 text-sm text-[var(--foreground)] leading-relaxed flex flex-col gap-5">

          <p className="text-xs text-[var(--muted-foreground)]">
            Last updated: July 27, 2026
          </p>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">1. Who We Are</h3>
            <p>
              mokhaLab Inc. (&ldquo;mokhaLab&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates{" "}
              <a href="https://www.mokhalab.com" className="underline underline-offset-2 hover:opacity-70">
                www.mokhalab.com
              </a>{" "}
              and sells precision coffee tools via Amazon and our website. Our registered address is
              1155 The High St #103, Coquitlam, BC V3B 7W4, Canada.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">2. Information We Collect</h3>
            <p>We may collect the following types of information:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-[var(--muted-foreground)]">
              <li><span className="text-[var(--foreground)] font-medium">Usage data</span> — pages visited, time on site, referring URLs, and browser/device type, collected automatically via cookies and analytics tools.</li>
              <li><span className="text-[var(--foreground)] font-medium">Contact information</span> — name and email address if you submit our contact form or support request.</li>
              <li><span className="text-[var(--foreground)] font-medium">Cookie identifiers</span> — small text files stored on your device to support analytics and advertising, subject to your consent choices.</li>
            </ul>
            <p>
              We do <span className="font-medium">not</span> collect payment information directly — all purchases through Amazon are handled by Amazon&rsquo;s own systems and privacy policy.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">3. How We Use Your Information</h3>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-[var(--muted-foreground)]">
              <li>To understand how visitors use our site and improve the experience (analytics).</li>
              <li>To measure the effectiveness of our advertising campaigns.</li>
              <li>To respond to support and contact form submissions.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">4. Cookies &amp; Tracking Technologies</h3>
            <p>
              We use cookies and similar technologies. You can manage your preferences at any time
              using the cookie consent panel (accessible via the banner shown on your first visit,
              or the &ldquo;Privacy &amp; Consent&rdquo; link in the footer).
            </p>
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Cookie type</th>
                    <th className="px-3 py-2 text-left font-medium">Purpose</th>
                    <th className="px-3 py-2 text-left font-medium">Can opt out?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--muted-foreground)]">
                  <tr>
                    <td className="px-3 py-2">Strictly necessary</td>
                    <td className="px-3 py-2">Site functionality, consent preferences</td>
                    <td className="px-3 py-2">No</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Analytics</td>
                    <td className="px-3 py-2">Google Analytics — traffic and behaviour</td>
                    <td className="px-3 py-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Advertising</td>
                    <td className="px-3 py-2">Google Ads, Meta Pixel — ad performance</td>
                    <td className="px-3 py-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Ad personalisation</td>
                    <td className="px-3 py-2">Personalised ads based on browsing</td>
                    <td className="px-3 py-2">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">5. Third-Party Services</h3>
            <p>We use the following third-party services that may process your data:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-[var(--muted-foreground)]">
              <li><span className="text-[var(--foreground)] font-medium">Google Analytics &amp; Google Tag Manager</span> — website analytics and tag management. <a href="https://policies.google.com/privacy" className="underline underline-offset-2 hover:opacity-70 text-[var(--foreground)]" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
              <li><span className="text-[var(--foreground)] font-medium">Meta Pixel (Facebook)</span> — advertising measurement and retargeting. <a href="https://www.facebook.com/privacy/policy" className="underline underline-offset-2 hover:opacity-70 text-[var(--foreground)]" target="_blank" rel="noopener noreferrer">Meta Privacy Policy</a></li>
              <li><span className="text-[var(--foreground)] font-medium">Amazon</span> — product purchases and fulfilment. <a href="https://www.amazon.com/privacy" className="underline underline-offset-2 hover:opacity-70 text-[var(--foreground)]" target="_blank" rel="noopener noreferrer">Amazon Privacy Policy</a></li>
              <li><span className="text-[var(--foreground)] font-medium">AWS Amplify / Amazon Web Services</span> — hosting and backend infrastructure.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">6. Data Retention</h3>
            <p>
              Analytics data is retained according to the settings of each third-party service
              (typically 14 months for Google Analytics). Contact form submissions are retained
              only as long as necessary to respond to your inquiry.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">7. Your Rights</h3>
            <p>
              Depending on your location, you may have rights under applicable privacy law
              (including Canada&rsquo;s PIPEDA and BC&rsquo;s PIPA) to:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-[var(--muted-foreground)]">
              <li>Access the personal information we hold about you.</li>
              <li>Request correction of inaccurate information.</li>
              <li>Withdraw consent for non-essential cookies at any time.</li>
              <li>Request deletion of your personal data where we are the data controller.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:hello@mokhalab.com" className="underline underline-offset-2 hover:opacity-70">
                hello@mokhalab.com
              </a>.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">8. Changes to This Policy</h3>
            <p>
              We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at
              the top reflects the most recent revision. Continued use of the site after changes
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">9. Contact</h3>
            <p>
              mokhaLab Inc.<br />
              1155 The High St #103, Coquitlam, BC V3B 7W4, Canada<br />
              <a href="mailto:hello@mokhalab.com" className="underline underline-offset-2 hover:opacity-70">
                hello@mokhalab.com
              </a>
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] shrink-0">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-80 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
