"use client"

import { useState, useRef, useCallback } from "react"
import { uploadData } from "aws-amplify/storage"
import { generateClient } from "aws-amplify/data"
import type { Schema } from "@/amplify/data/resource"
import {
  US_STATES,
  CA_PROVINCES,
  RETURN_REASONS,
  PREFERRED_RESOLUTIONS,
  type CaseType,
  type Country,
} from "@/lib/support-data"
import outputs from "@/amplify_outputs.json"
import { Amplify } from "aws-amplify"

Amplify.configure(outputs, { ssr: false })

const SUPPORT_API_URL =
  (outputs as { custom?: { supportApiUrl?: string } }).custom?.supportApiUrl ?? ""

// ─── Ticket ID generation ─────────────────────────────────────────────────────

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_PHOTOS = 5

// ─── Field types ──────────────────────────────────────────────────────────────

interface FormState {
  customerName: string
  email: string
  phone: string
  country: Country | ""
  state: string
  caseType: CaseType | ""
  productName: string
  amazonPurchase: "yes" | "no" | ""
  amazonOrderId: string
  purchaseDate: string
  issueDescription: string
  returnReason: string
  returnReasonOther: string
  preferredResolution: string
  preferredResolutionOther: string
  preferredContact: "Email" | "Phone" | ""
  consentGiven: boolean
}

const INITIAL_FORM: FormState = {
  customerName: "",
  email: "",
  phone: "",
  country: "",
  state: "",
  caseType: "",
  productName: "",
  amazonPurchase: "",
  amazonOrderId: "",
  purchaseDate: "",
  issueDescription: "",
  returnReason: "",
  returnReasonOther: "",
  preferredResolution: "",
  preferredResolutionOther: "",
  preferredContact: "",
  consentGiven: false,
}

// ─── Shared input classes ─────────────────────────────────────────────────────

const inputBase =
  "w-full bg-transparent border border-border rounded-[10px] px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 focus:ring-0 transition-colors disabled:opacity-50"

const selectBase = `${inputBase} appearance-none`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTicketId(country: Country, seq: number): string {
  const code = country === "USA" ? "US" : "CA"
  return `T-${code}-${String(seq).padStart(3, "0")}`
}

async function getNextTicketSequence(
  client: ReturnType<typeof generateClient<Schema>>,
  country: Country
): Promise<number> {
  try {
    const { data: tickets } = await client.models.SupportTicket.list({
      filter: { country: { eq: country } },
    })
    const nums = (tickets ?? [])
      .map((t) => {
        const match = t.ticketId?.match(/(\d+)$/)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter(Boolean)
    return nums.length > 0 ? Math.max(...nums) + 1 : 1
  } catch {
    // Fall back to a timestamp-based number if query fails
    return Date.now() % 10000
  }
}

// ─── Photo upload ─────────────────────────────────────────────────────────────

interface PhotoFile {
  file: File
  previewUrl: string
  error?: string
}

function usePhotoUploader() {
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [proofFile, setProofFile] = useState<PhotoFile | null>(null)

  const addPhotos = useCallback(
    (files: FileList | null) => {
      if (!files) return
      const newPhotos: PhotoFile[] = []
      const errors: string[] = []

      Array.from(files).forEach((file) => {
        if (photos.length + newPhotos.length >= MAX_PHOTOS) {
          errors.push(`Maximum ${MAX_PHOTOS} photos allowed.`)
          return
        }
        if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
          errors.push(`${file.name}: unsupported format. Use JPG, PNG, or WEBP.`)
          return
        }
        if (file.size > MAX_PHOTO_SIZE_BYTES) {
          errors.push(`${file.name}: exceeds 5 MB limit.`)
          return
        }
        newPhotos.push({ file, previewUrl: URL.createObjectURL(file) })
      })

      setPhotos((prev) => [...prev, ...newPhotos])
      return errors.length > 0 ? errors[0] : undefined
    },
    [photos.length]
  )

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const setProof = useCallback((files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return "Unsupported format. Use JPG, PNG, or WEBP."
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      return "File exceeds 5 MB limit."
    }
    if (proofFile) URL.revokeObjectURL(proofFile.previewUrl)
    setProofFile({ file, previewUrl: URL.createObjectURL(file) })
    return undefined
  }, [proofFile])

  const removeProof = useCallback(() => {
    if (proofFile) URL.revokeObjectURL(proofFile.previewUrl)
    setProofFile(null)
  }, [proofFile])

  return { photos, addPhotos, removePhoto, proofFile, setProof, removeProof }
}

// ─── Validation ───────────────────────────────────────────────────────────────

interface FieldErrors {
  [key: string]: string
}

function validate(form: FormState, photoError: string): FieldErrors {
  const errors: FieldErrors = {}

  if (!form.customerName.trim()) errors.customerName = "Full name is required."
  if (!form.email.trim()) {
    errors.email = "Email address is required."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address."
  }
  if (!form.country) errors.country = "Country is required."
  if (!form.state) errors.state = "State / Province is required."
  if (!form.caseType) errors.caseType = "Please select a case type."
  if (!form.productName.trim()) errors.productName = "Product name is required."
  if (!form.issueDescription.trim()) errors.issueDescription = "Issue description is required."
  if (form.amazonPurchase === "") errors.amazonPurchase = "Please indicate if purchased on Amazon."
  if (form.amazonPurchase === "yes" && !form.amazonOrderId.trim())
    errors.amazonOrderId = "Amazon Order ID is required."
  if ((form.caseType === "Warranty" || form.caseType === "Return") && !form.purchaseDate)
    errors.purchaseDate = "Purchase date is required."
  if (form.caseType === "Return" && !form.returnReason)
    errors.returnReason = "Please select a return reason."
  if (form.caseType === "Return" && form.returnReason === "Other" && !form.returnReasonOther.trim())
    errors.returnReasonOther = "Please describe your reason."
  if (
    (form.caseType === "Warranty" || form.caseType === "Return") &&
    !form.preferredResolution
  )
    errors.preferredResolution = "Please select a preferred resolution."
  if (
    (form.caseType === "Warranty" || form.caseType === "Return") &&
    form.preferredResolution === "Other" &&
    !form.preferredResolutionOther.trim()
  )
    errors.preferredResolutionOther = "Please describe your preferred resolution."
  if (!form.preferredContact) errors.preferredContact = "Please select a contact method."
  if (!form.consentGiven) errors.consentGiven = "You must agree to the Privacy Policy to submit."
  if (photoError) errors.photos = photoError

  return errors
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-[13px] text-destructive">{message}</p>
}

function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[14px] font-medium text-foreground mb-1.5"
    >
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[17px] font-semibold text-foreground pt-2 pb-1 border-b border-border">
      {children}
    </h2>
  )
}

// ─── Confirmation screen ──────────────────────────────────────────────────────

function ConfirmationScreen({ ticketId }: { ticketId: string }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-foreground/5 mb-6">
        <svg
          className="w-8 h-8 text-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-[28px] font-semibold text-foreground mb-3">Request Received</h2>
      <p className="text-[17px] text-muted-foreground mb-2">
        Your ticket has been submitted successfully.
      </p>
      <p className="text-[15px] text-muted-foreground mb-6">
        Ticket ID: <span className="font-mono font-semibold text-foreground">{ticketId}</span>
      </p>
      <p className="text-[15px] text-muted-foreground max-w-sm mx-auto">
        We&apos;ll get back to you within 24 hours. A confirmation has been sent to your email.
      </p>
      <p className="text-[13px] text-muted-foreground/70 mt-4">
        Need help sooner? Email us at{" "}
        <a href="mailto:anas@mokhalab.com" className="underline">
          anas@mokhalab.com
        </a>
      </p>
    </div>
  )
}

// ─── Main Form Component ──────────────────────────────────────────────────────

export default function SupportForm() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [photoUploadError, setPhotoUploadError] = useState("")
  const [proofUploadError, setProofUploadError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [confirmedTicketId, setConfirmedTicketId] = useState<string | null>(null)

  const photoInputRef = useRef<HTMLInputElement>(null)
  const proofInputRef = useRef<HTMLInputElement>(null)
  const { photos, addPhotos, removePhoto, proofFile, setProof, removeProof } = usePhotoUploader()

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear error on change
    if (errors[key]) setErrors((prev) => { const e = { ...prev }; delete e[key]; return e })
  }

  const stateOptions = form.country === "USA" ? US_STATES : form.country === "Canada" ? CA_PROVINCES : []

  function handlePhotoAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const err = addPhotos(e.target.files)
    setPhotoUploadError(err ?? "")
    if (photoInputRef.current) photoInputRef.current.value = ""
  }

  function handleProofAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const err = setProof(e.target.files)
    setProofUploadError(err ?? "")
    if (proofInputRef.current) proofInputRef.current.value = ""
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError("")

    const validationErrors = validate(form, photoUploadError)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      // Scroll to first error
      const firstField = document.querySelector("[data-field-error]")
      firstField?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    setSubmitting(true)
    try {
      // 1. Upload photos to S3
      const timestamp = Date.now()
      let photoKeys: string[] = []
      let proofKey: string | undefined

      if (photos.length > 0) {
        const uploads = await Promise.all(
          photos.map((p, i) =>
            uploadData({
              path: `support-uploads/${timestamp}-photo-${i}.${p.file.name.split(".").pop()}`,
              data: p.file,
              options: { contentType: p.file.type },
            }).result
          )
        )
        photoKeys = uploads.map((u) => u.path)
      }

      if (proofFile) {
        const ext = proofFile.file.name.split(".").pop()
        const result = await uploadData({
          path: `support-uploads/${timestamp}-proof.${ext}`,
          data: proofFile.file,
          options: { contentType: proofFile.file.type },
        }).result
        proofKey = result.path
      }

      // 2. Create the ticket record in DynamoDB
      const client = generateClient<Schema>()
      const country = form.country as Country
      const seq = await getNextTicketSequence(client, country)
      const ticketId = generateTicketId(country, seq)
      const now = new Date().toISOString()

      await client.models.SupportTicket.create({
        ticketId,
        customerName: form.customerName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        country: form.country as "USA" | "Canada",
        state: form.state,
        caseType: form.caseType as "Inquiry" | "Warranty" | "Return",
        productName: form.productName.trim(),
        amazonPurchase: form.amazonPurchase === "yes",
        amazonOrderId: form.amazonPurchase === "yes" ? form.amazonOrderId.trim() : undefined,
        purchaseDate: form.purchaseDate || undefined,
        issueDescription: form.issueDescription.trim(),
        returnReason: form.returnReason || undefined,
        returnReasonOther:
          form.returnReason === "Other" ? form.returnReasonOther.trim() : undefined,
        preferredResolution: form.preferredResolution || undefined,
        preferredResolutionOther:
          form.preferredResolution === "Other" ? form.preferredResolutionOther.trim() : undefined,
        preferredContact: form.preferredContact as "Email" | "Phone",
        photoKeys: photoKeys.length > 0 ? photoKeys.join(",") : undefined,
        proofOfPurchaseKey: proofKey,
        submissionTimestamp: now,
        consentTimestamp: now,
        status: "New",
      })

      // 3. Send confirmation emails via Lambda
      if (SUPPORT_API_URL) {
        await fetch(SUPPORT_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId,
            customerName: form.customerName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || undefined,
            country: form.country,
            state: form.state,
            caseType: form.caseType,
            productName: form.productName.trim(),
            amazonPurchase: form.amazonPurchase === "yes",
            amazonOrderId: form.amazonPurchase === "yes" ? form.amazonOrderId.trim() : undefined,
            purchaseDate: form.purchaseDate || undefined,
            issueDescription: form.issueDescription.trim(),
            returnReason: form.returnReason || undefined,
            returnReasonOther:
              form.returnReason === "Other" ? form.returnReasonOther.trim() : undefined,
            preferredResolution: form.preferredResolution || undefined,
            preferredResolutionOther:
              form.preferredResolution === "Other" ? form.preferredResolutionOther.trim() : undefined,
            preferredContact: form.preferredContact,
            photoCount: photoKeys.length,
            submissionTimestamp: now,
            consentTimestamp: now,
          }),
        })
        // Non-fatal: ticket already saved even if email fails
      }

      setConfirmedTicketId(ticketId)
    } catch (err) {
      console.error("Support form submission error:", err)
      setSubmitError(
        "Something went wrong submitting your request. Please try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmedTicketId) {
    return <ConfirmationScreen ticketId={confirmedTicketId} />
  }

  const showPurchaseFields = form.caseType === "Warranty" || form.caseType === "Return"
  const showReturnFields = form.caseType === "Return"
  const showResolutionField = form.caseType === "Warranty" || form.caseType === "Return"
  const showPhotoFields = form.caseType === "Warranty" || form.caseType === "Return"

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">

      {/* ── Section 1: Basic Information ───────────────────────────────── */}
      <SectionHeading>Your Information</SectionHeading>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full name */}
        <div data-field-error={errors.customerName ? true : undefined}>
          <Label htmlFor="customerName" required>Full name</Label>
          <input
            id="customerName"
            type="text"
            autoComplete="name"
            value={form.customerName}
            onChange={(e) => set("customerName", e.target.value)}
            className={inputBase}
            placeholder="Jane Smith"
            aria-describedby={errors.customerName ? "customerName-err" : undefined}
          />
          <FieldError message={errors.customerName} />
        </div>

        {/* Email */}
        <div data-field-error={errors.email ? true : undefined}>
          <Label htmlFor="email" required>Email address</Label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputBase}
            placeholder="jane@example.com"
            aria-describedby={errors.email ? "email-err" : undefined}
          />
          <FieldError message={errors.email} />
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone">Phone number <span className="text-muted-foreground font-normal text-[13px]">(optional)</span></Label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={inputBase}
            placeholder="+1 (555) 000-0000"
          />
        </div>

        {/* Country */}
        <div data-field-error={errors.country ? true : undefined}>
          <Label htmlFor="country" required>Country</Label>
          <select
            id="country"
            value={form.country}
            onChange={(e) => {
              set("country", e.target.value as Country | "")
              set("state", "")
            }}
            className={selectBase}
            aria-describedby={errors.country ? "country-err" : undefined}
          >
            <option value="" disabled>Select country</option>
            <option value="USA">United States</option>
            <option value="Canada">Canada</option>
          </select>
          <FieldError message={errors.country} />
        </div>

        {/* State / Province */}
        <div data-field-error={errors.state ? true : undefined} className="sm:col-span-2 sm:max-w-xs">
          <Label htmlFor="state" required>State / Province</Label>
          <select
            id="state"
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
            disabled={!form.country}
            className={selectBase}
            aria-describedby={errors.state ? "state-err" : undefined}
          >
            <option value="" disabled>
              {form.country ? "Select state / province" : "Select country first"}
            </option>
            {stateOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <FieldError message={errors.state} />
        </div>
      </div>

      {/* ── Section 2: Case Type ────────────────────────────────────────── */}
      <SectionHeading>Case Type</SectionHeading>

      <div data-field-error={errors.caseType ? true : undefined}>
        <fieldset>
          <legend className="block text-[14px] font-medium text-foreground mb-3">
            What can we help you with?<span className="text-destructive ml-0.5">*</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {(["Inquiry", "Warranty", "Return"] as CaseType[]).map((type) => (
              <label
                key={type}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px] border cursor-pointer text-[15px] transition-colors ${
                  form.caseType === type
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground hover:border-foreground/40"
                }`}
              >
                <input
                  type="radio"
                  name="caseType"
                  value={type}
                  checked={form.caseType === type}
                  onChange={() => {
                    set("caseType", type)
                    set("returnReason", "")
                    set("returnReasonOther", "")
                    set("preferredResolution", "")
                    set("preferredResolutionOther", "")
                    set("purchaseDate", "")
                  }}
                  className="sr-only"
                />
                {type}
              </label>
            ))}
          </div>
        </fieldset>
        <FieldError message={errors.caseType} />
      </div>

      {/* ── Section 3: Product & Order Details ─────────────────────────── */}
      <SectionHeading>Product & Order Details</SectionHeading>

      <div className="flex flex-col gap-4">
        {/* Product name */}
        <div data-field-error={errors.productName ? true : undefined}>
          <Label htmlFor="productName" required>Product name / model</Label>
          <input
            id="productName"
            type="text"
            value={form.productName}
            onChange={(e) => set("productName", e.target.value)}
            className={inputBase}
            placeholder="e.g. Precision Impact Tamper 58mm"
          />
          <FieldError message={errors.productName} />
        </div>

        {/* Amazon purchase toggle */}
        <div data-field-error={errors.amazonPurchase ? true : undefined}>
          <fieldset>
            <legend className="block text-[14px] font-medium text-foreground mb-2">
              Did you purchase this from Amazon?<span className="text-destructive ml-0.5">*</span>
            </legend>
            <div className="flex gap-3">
              {(["yes", "no"] as const).map((val) => (
                <label
                  key={val}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[10px] border cursor-pointer text-[15px] transition-colors ${
                    form.amazonPurchase === val
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:border-foreground/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="amazonPurchase"
                    value={val}
                    checked={form.amazonPurchase === val}
                    onChange={() => {
                      set("amazonPurchase", val)
                      if (val === "no") set("amazonOrderId", "")
                    }}
                    className="sr-only"
                  />
                  {val === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </fieldset>
          <FieldError message={errors.amazonPurchase} />
        </div>

        {/* Amazon Order ID — conditional */}
        {form.amazonPurchase === "yes" && (
          <div data-field-error={errors.amazonOrderId ? true : undefined}>
            <Label htmlFor="amazonOrderId" required>Amazon Order ID</Label>
            <input
              id="amazonOrderId"
              type="text"
              value={form.amazonOrderId}
              onChange={(e) => set("amazonOrderId", e.target.value)}
              className={inputBase}
              placeholder="e.g. 113-1234567-1234567"
            />
            <FieldError message={errors.amazonOrderId} />
          </div>
        )}

        {/* Purchase date — Warranty + Return */}
        {showPurchaseFields && (
          <div data-field-error={errors.purchaseDate ? true : undefined} className="max-w-xs">
            <Label htmlFor="purchaseDate" required>Purchase date</Label>
            <input
              id="purchaseDate"
              type="date"
              value={form.purchaseDate}
              onChange={(e) => set("purchaseDate", e.target.value)}
              className={inputBase}
              max={new Date().toISOString().split("T")[0]}
            />
            <FieldError message={errors.purchaseDate} />
          </div>
        )}
      </div>

      {/* ── Section 4: Issue Description ────────────────────────────────── */}
      <SectionHeading>Issue Details</SectionHeading>

      <div className="flex flex-col gap-4">
        <div data-field-error={errors.issueDescription ? true : undefined}>
          <Label htmlFor="issueDescription" required>Issue description</Label>
          <textarea
            id="issueDescription"
            rows={5}
            value={form.issueDescription}
            onChange={(e) => set("issueDescription", e.target.value)}
            className={`${inputBase} resize-none`}
            placeholder="Describe your issue in detail…"
          />
          <FieldError message={errors.issueDescription} />
        </div>

        {/* Return reason — Return only */}
        {showReturnFields && (
          <>
            <div data-field-error={errors.returnReason ? true : undefined}>
              <Label htmlFor="returnReason" required>Return reason</Label>
              <select
                id="returnReason"
                value={form.returnReason}
                onChange={(e) => {
                  set("returnReason", e.target.value)
                  set("returnReasonOther", "")
                }}
                className={selectBase}
              >
                <option value="" disabled>Select a reason</option>
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <FieldError message={errors.returnReason} />
            </div>
            {form.returnReason === "Other" && (
              <div data-field-error={errors.returnReasonOther ? true : undefined}>
                <Label htmlFor="returnReasonOther" required>Please describe</Label>
                <textarea
                  id="returnReasonOther"
                  rows={3}
                  value={form.returnReasonOther}
                  onChange={(e) => set("returnReasonOther", e.target.value)}
                  className={`${inputBase} resize-none`}
                  placeholder="Describe your reason…"
                />
                <FieldError message={errors.returnReasonOther} />
              </div>
            )}
          </>
        )}

        {/* Preferred resolution — Warranty + Return */}
        {showResolutionField && (
          <>
            <div data-field-error={errors.preferredResolution ? true : undefined}>
              <Label htmlFor="preferredResolution" required>Preferred resolution</Label>
              <select
                id="preferredResolution"
                value={form.preferredResolution}
                onChange={(e) => {
                  set("preferredResolution", e.target.value)
                  set("preferredResolutionOther", "")
                }}
                className={selectBase}
              >
                <option value="" disabled>Select preferred resolution</option>
                {PREFERRED_RESOLUTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <FieldError message={errors.preferredResolution} />
            </div>
            {form.preferredResolution === "Other" && (
              <div data-field-error={errors.preferredResolutionOther ? true : undefined}>
                <Label htmlFor="preferredResolutionOther" required>Please describe</Label>
                <textarea
                  id="preferredResolutionOther"
                  rows={3}
                  value={form.preferredResolutionOther}
                  onChange={(e) => set("preferredResolutionOther", e.target.value)}
                  className={`${inputBase} resize-none`}
                  placeholder="Describe what you're looking for…"
                />
                <FieldError message={errors.preferredResolutionOther} />
              </div>
            )}
          </>
        )}

        {/* Photo + Proof uploads — Warranty + Return */}
        {showPhotoFields && (
          <>
            {/* Proof of purchase */}
            <div>
              <Label htmlFor="proof-upload" required>Proof of purchase</Label>
              <p className="text-[13px] text-muted-foreground mb-2">
                Upload a photo of your receipt or order confirmation. JPG, PNG, or WEBP, max 5 MB.
              </p>
              <input
                ref={proofInputRef}
                id="proof-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="sr-only"
                onChange={handleProofAdd}
              />
              {!proofFile ? (
                <button
                  type="button"
                  onClick={() => proofInputRef.current?.click()}
                  className="inline-flex items-center gap-2 border border-border rounded-[10px] px-4 py-2.5 text-[14px] text-foreground hover:border-foreground/40 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload proof of purchase
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proofFile.previewUrl} alt="Proof of purchase preview" className="h-16 w-16 object-cover rounded-[8px] border border-border" />
                  <div>
                    <p className="text-[14px] text-foreground">{proofFile.file.name}</p>
                    <button type="button" onClick={removeProof} className="text-[13px] text-muted-foreground hover:text-foreground underline mt-0.5">
                      Remove
                    </button>
                  </div>
                </div>
              )}
              {proofUploadError && <FieldError message={proofUploadError} />}
            </div>

            {/* Product photos */}
            <div>
              <Label htmlFor="photo-upload">Product photos <span className="text-muted-foreground font-normal text-[13px]">(optional, up to 5)</span></Label>
              <p className="text-[13px] text-muted-foreground mb-2">
                JPG, PNG, or WEBP. Max 5 MB per photo.
              </p>
              <input
                ref={photoInputRef}
                id="photo-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                multiple
                className="sr-only"
                onChange={handlePhotoAdd}
              />
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center gap-2 border border-border rounded-[10px] px-4 py-2.5 text-[14px] text-foreground hover:border-foreground/40 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Add photo{photos.length > 0 ? "s" : ""} ({photos.length}/{MAX_PHOTOS})
                </button>
              )}
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {photos.map((p, i) => (
                    <div key={i} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.previewUrl} alt={`Photo ${i + 1}`} className="h-20 w-20 object-cover rounded-[8px] border border-border" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        aria-label={`Remove photo ${i + 1}`}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-foreground text-background rounded-full text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photoUploadError && <FieldError message={photoUploadError} />}
              {errors.photos && <FieldError message={errors.photos} />}
            </div>
          </>
        )}
      </div>

      {/* ── Section 5: Contact Preference ──────────────────────────────── */}
      <SectionHeading>Contact Preference</SectionHeading>

      <div data-field-error={errors.preferredContact ? true : undefined}>
        <fieldset>
          <legend className="block text-[14px] font-medium text-foreground mb-2">
            How would you prefer we contact you?<span className="text-destructive ml-0.5">*</span>
          </legend>
          <div className="flex gap-3">
            {(["Email", "Phone"] as const).map((val) => (
              <label
                key={val}
                className={`flex items-center gap-2 px-4 py-2 rounded-[10px] border cursor-pointer text-[15px] transition-colors ${
                  form.preferredContact === val
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground hover:border-foreground/40"
                }`}
              >
                <input
                  type="radio"
                  name="preferredContact"
                  value={val}
                  checked={form.preferredContact === val}
                  onChange={() => set("preferredContact", val)}
                  className="sr-only"
                />
                {val}
              </label>
            ))}
          </div>
        </fieldset>
        <FieldError message={errors.preferredContact} />
      </div>

      {/* ── Section 6: Consent ─────────────────────────────────────────── */}
      <SectionHeading>Privacy & Consent</SectionHeading>

      <div data-field-error={errors.consentGiven ? true : undefined}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.consentGiven}
            onChange={(e) => set("consentGiven", e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-border accent-foreground flex-shrink-0"
            aria-describedby={errors.consentGiven ? "consent-err" : undefined}
          />
          <span className="text-[14px] text-muted-foreground leading-relaxed">
            I agree to mokhaLab&apos;s{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 hover:opacity-70"
            >
              Privacy Policy
            </a>{" "}
            and consent to my data being stored and used to process my support request.
            <span className="text-destructive ml-0.5">*</span>
          </span>
        </label>
        <FieldError message={errors.consentGiven} />
      </div>

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      {submitError && (
        <p className="text-[14px] text-destructive bg-destructive/5 border border-destructive/20 rounded-[10px] px-4 py-3">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="self-start bg-foreground text-background text-[15px] font-medium rounded-[10px] px-8 py-3.5 hover:opacity-80 transition-opacity disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit Request"}
      </button>
    </form>
  )
}
