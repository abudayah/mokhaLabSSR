"use client"

import { useState } from "react"
import Link from "next/link"
import { SocialLinks } from "@/components/social-links"
import outputs from "@/amplify_outputs.json"

const contactApiUrl =
  (outputs as { custom?: { contactApiUrl?: string } }).custom?.contactApiUrl ?? ""

export function SiteFooter() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const inputClass =
    "w-full bg-transparent border border-border rounded-[10px] px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 focus:ring-0 transition-colors"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    try {
      const res = await fetch(contactApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error()
      setStatus("success")
    } catch {
      setStatus("error")
    }
  }

  return (
    <footer
      className="border-t border-border pt-16 pb-12"
      style={{ backgroundColor: "#f5f5f7" }}
      id="contact"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          {/* Left: Logo + Socials */}
          <div className="flex flex-col gap-6">
            <Link
              href="/"
              className="hover:opacity-70 transition-opacity"
              aria-label="mokhaLab home"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mokhaLab-logo.svg"
                alt="mokhaLab"
                width={106}
                height={24}
                className="h-6 w-auto dark:invert"
              />
            </Link>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xs">
              Precision-engineered tools for the serious barista. Every gram matters.
            </p>
            <SocialLinks size={20} />
            <p className="text-[13px] text-muted-foreground/60 mt-4">
              &copy; {new Date().getFullYear()} mokhaLab Inc. &mdash; Coquitlam, BC, Canada. All
              rights reserved.
            </p>
          </div>

          {/* Right: Contact Form */}
          <div>
            <h3 className="text-[17px] font-semibold text-foreground mb-6">Contact Us</h3>
            {status === "success" ? (
              <div className="text-[15px] text-muted-foreground leading-relaxed py-4">
                Thank you for reaching out. We&apos;ll be in touch soon.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={inputClass}
                />
                <select
                  required
                  aria-label="Subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className={`${inputClass} appearance-none`}
                >
                  <option value="" disabled>Subject</option>
                  <option value="General Question">General Question</option>
                  <option value="Product Support">Product Support</option>
                  <option value="Order & Shipping">Order &amp; Shipping</option>
                  <option value="Wholesale & Vendors">Wholesale &amp; Vendors</option>
                  <option value="Press & Media">Press &amp; Media</option>
                  <option value="Other">Other</option>
                </select>
                <textarea
                  placeholder="Message"
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className={`${inputClass} resize-none`}
                />
                {status === "error" && (
                  <p className="text-[13px] text-destructive">
                    Something went wrong. Please try again or email us directly.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="mt-1 bg-foreground text-background text-[15px] font-medium rounded-[10px] px-6 py-3 hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {status === "loading" ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
