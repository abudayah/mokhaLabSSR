"use client"

import { useEffect, useState } from "react"
import { PrivacyPolicyModal } from "@/components/privacy-policy-modal"

// ─── Types ────────────────────────────────────────────────────────────────────

type ConsentState = "granted" | "denied"

interface ConsentPreferences {
  analytics_storage: ConsentState
  ad_storage: ConsentState
  ad_user_data: ConsentState
  ad_personalization: ConsentState
}

type BannerVisibility = "hidden" | "banner" | "manage"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "mokhalab_consent"

function readStoredConsent(): ConsentPreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ConsentPreferences) : null
  } catch {
    return null
  }
}

function writeStoredConsent(prefs: ConsentPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // storage unavailable — silently ignore
  }
}

function pushConsentUpdate(prefs: ConsentPreferences) {
  // dataLayer is initialised by the GTM snippet in layout.tsx
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event: "consent_update", ...prefs })
  // Also call gtag consent update so GTM consent mode picks it up
  window.dataLayer.push(function (this: unknown) {
    // @ts-expect-error — gtag is injected by GTM at runtime
    if (typeof gtag === "function") {
      // @ts-expect-error
      gtag("consent", "update", prefs)
    }
  })
}

const FULL_GRANT: ConsentPreferences = {
  analytics_storage: "granted",
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
}

const FULL_DENY: ConsentPreferences = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
}

const DEFAULT_MANAGE: ConsentPreferences = {
  analytics_storage: "granted",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConsentBanner() {
  const [visibility, setVisibility] = useState<BannerVisibility>("hidden")
  const [draft, setDraft] = useState<ConsentPreferences>(FULL_DENY)
  const [privacyOpen, setPrivacyOpen] = useState(false)

  // On mount: if consent was already saved, apply it silently; otherwise show banner
  useEffect(() => {
    const stored = readStoredConsent()
    if (stored) {
      pushConsentUpdate(stored)
      // Keep banner hidden — user already chose
    } else {
      setVisibility("banner")
    }
  }, [])

  function acceptAll() {
    writeStoredConsent(FULL_GRANT)
    pushConsentUpdate(FULL_GRANT)
    setVisibility("hidden")
  }

  function rejectAll() {
    writeStoredConsent(FULL_DENY)
    pushConsentUpdate(FULL_DENY)
    setVisibility("hidden")
  }

  function openManage() {
    setDraft(readStoredConsent() ?? DEFAULT_MANAGE)
    setVisibility("manage")
  }

  function savePreferences() {
    writeStoredConsent(draft)
    pushConsentUpdate(draft)
    setVisibility("hidden")
  }

  function toggleDraft(key: keyof ConsentPreferences) {
    setDraft((prev) => ({
      ...prev,
      [key]: prev[key] === "granted" ? "denied" : "granted",
    }))
  }

  if (visibility === "hidden") return (
    <>
      {privacyOpen && <PrivacyPolicyModal onClose={() => setPrivacyOpen(false)} />}
    </>
  )

  // ── Manage preferences panel ────────────────────────────────────────────────
  if (visibility === "manage") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cookie preferences"
        className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center p-4"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setVisibility("banner")}
          aria-hidden="true"
        />

        {/* Panel */}
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Cookie preferences
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Choose which cookies you allow. Strictly necessary cookies are always active.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Necessary — always on */}
            <ConsentRow
              label="Strictly necessary"
              description="Required for the site to function. Cannot be disabled."
              checked={true}
              disabled
              onChange={() => {}}
            />

            <ConsentRow
              label="Analytics"
              description="Helps us understand how visitors use the site (Google Analytics)."
              checked={draft.analytics_storage === "granted"}
              onChange={() => toggleDraft("analytics_storage")}
            />

            <ConsentRow
              label="Advertising"
              description="Used to measure ad performance and show relevant ads."
              checked={draft.ad_storage === "granted"}
              onChange={() => toggleDraft("ad_storage")}
            />

            <ConsentRow
              label="Ad personalisation"
              description="Allows Google to personalise ads based on your interests."
              checked={draft.ad_personalization === "granted"}
              onChange={() => toggleDraft("ad_personalization")}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
            <button
              onClick={() => setVisibility("banner")}
              className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              Back
            </button>
            <button
              onClick={savePreferences}
              className="flex-1 rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-80 transition-opacity"
            >
              Save preferences
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main banner ─────────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed bottom-3 inset-x-3 z-[9999] bg-white border border-[var(--border)] rounded-2xl shadow-2xl px-6 py-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 max-w-screen-2xl mx-auto">
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            We use cookies
          </p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)] leading-relaxed">
            We use cookies and similar technologies to analyse traffic, personalise content, and
            serve relevant ads. By clicking{" "}
            <span className="font-medium text-[var(--foreground)]">Accept all</span>, you consent
            to our use of cookies.{" "}
            <button
              onClick={() => setPrivacyOpen(true)}
              className="underline underline-offset-2 hover:text-[var(--foreground)] transition-colors"
            >
              Privacy policy
            </button>
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-row gap-2 shrink-0">
          <button
            onClick={acceptAll}
            className="rounded-xl bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            Accept all
          </button>
          <button
            onClick={rejectAll}
            className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors whitespace-nowrap"
          >
            Reject all
          </button>
          <button
            onClick={openManage}
            className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors whitespace-nowrap"
          >
            Manage
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

interface ConsentRowProps {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
}

function ConsentRow({ label, description, checked, disabled = false, onChange }: ConsentRowProps) {
  const id = `consent-${label.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3.5">
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className={`text-sm font-medium ${disabled ? "text-[var(--muted-foreground)]" : "text-[var(--foreground)] cursor-pointer"}`}
        >
          {label}
        </label>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)] leading-relaxed">
          {description}
        </p>
      </div>
      {/* Toggle switch */}
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={`Toggle ${label}`}
        disabled={disabled}
        onClick={onChange}
        className={`
          relative mt-0.5 shrink-0 h-6 w-11 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          ${checked ? "bg-[var(--foreground)]" : "bg-[var(--border)]"}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
            ${checked ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  )
}
