"use client"

import { useRef, useState } from "react"
import { uploadData } from "aws-amplify/storage"
import Button from "@cloudscape-design/components/button"
import Box from "@cloudscape-design/components/box"
import SpaceBetween from "@cloudscape-design/components/space-between"
import ProgressBar from "@cloudscape-design/components/progress-bar"
import Badge from "@cloudscape-design/components/badge"
import { S3Image } from "@/components/S3Image"
import { resolveImageUrl } from "@/lib/image-url"

// ─── Constants ────────────────────────────────────────────────────────────────

const DISPLAY_MAX_WIDTH = 1200
const DISPLAY_MAX_HEIGHT = 1200
const OG_WIDTH = 1200
const OG_HEIGHT = 630
const WEBP_QUALITY = 0.88

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductImageUploaderProps {
  /** Current image paths — S3 keys (no leading slash) or /images/... public paths */
  images: string[]
  /** The main image — first in display order, used to derive og.webp */
  mainImage: string
  onChange: (images: string[], mainImage: string) => void
  /** Product ID or slug used to organise S3 paths */
  productId?: string
}

interface UploadingEntry {
  /** Unique key so React can track the item */
  id: string
  filename: string
  progress: number
  error: string | null
}

// ─── Canvas helpers (same pattern as ImageUploader.tsx) ───────────────────────

function canvasToWebpBlob(
  img: HTMLImageElement,
  targetW: number,
  targetH: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext("2d")
    if (!ctx) return reject(new Error("Canvas 2D context unavailable"))

    // Cover: scale so the image fills the target, then center-crop
    const scale = Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight)
    const scaledW = img.naturalWidth * scale
    const scaledH = img.naturalHeight * scale
    const offsetX = (targetW - scaledW) / 2
    const offsetY = (targetH - scaledH) / 2

    ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH)
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("canvas.toBlob returned null"))
      },
      "image/webp",
      WEBP_QUALITY
    )
  })
}

function loadImage(file: File): Promise<{ img: HTMLImageElement; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, objectUrl })
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Failed to load image"))
    }
    img.src = objectUrl
  })
}

function displayDimensions(naturalW: number, naturalH: number): { w: number; h: number } {
  const scale = Math.min(1, DISPLAY_MAX_WIDTH / naturalW, DISPLAY_MAX_HEIGHT / naturalH)
  return { w: Math.round(naturalW * scale), h: Math.round(naturalH * scale) }
}

function buildSlug(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductImageUploader({
  images,
  mainImage,
  onChange,
  productId,
}: ProductImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<UploadingEntry[]>([])
  const [globalError, setGlobalError] = useState<string | null>(null)

  const folder = `product-images/${productId || "new"}`

  // ── Upload handler ──────────────────────────────────────────────────────────

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (inputRef.current) inputRef.current.value = ""
    if (!files.length) return

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setGlobalError(`"${file.name}" is not an image file.`)
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        setGlobalError(`"${file.name}" exceeds the 10 MB limit.`)
        continue
      }
    }

    const validFiles = files.filter(
      (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    )
    if (!validFiles.length) return

    setGlobalError(null)

    // Determine whether any of these new images will become the main image.
    // The first new image becomes main only when there are no existing images.
    const isFirstEver = images.length === 0

    // Build initial progress entries so the UI shows them immediately
    const entries: UploadingEntry[] = validFiles.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      filename: f.name,
      progress: 0,
      error: null,
    }))
    setUploading((prev) => [...prev, ...entries])

    const uploadedKeys: string[] = []

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      const entry = entries[i]

      try {
        const { img, objectUrl } = await loadImage(file)
        URL.revokeObjectURL(objectUrl)

        const { w: dispW, h: dispH } = displayDimensions(img.naturalWidth, img.naturalHeight)
        const slug = buildSlug(file.name)
        const timestamp = Date.now()

        const displayBlob = await canvasToWebpBlob(img, dispW, dispH)
        const displayKey = `${folder}/${timestamp}-${slug}.webp`

        // Determine if this file should also generate the og.webp.
        // Criteria: it is the very first image being added overall (no existing images)
        // AND it is the first in this batch.
        const shouldUploadOg = isFirstEver && i === 0
        const ogBlob = shouldUploadOg
          ? await canvasToWebpBlob(img, OG_WIDTH, OG_HEIGHT)
          : null

        let displayBytes = 0
        let ogBytes = 0
        const totalBytes = displayBlob.size + (ogBlob?.size ?? 0)

        const updateProgress = () => {
          const pct = Math.round(((displayBytes + ogBytes) / totalBytes) * 100)
          setUploading((prev) =>
            prev.map((e) => (e.id === entry.id ? { ...e, progress: pct } : e))
          )
        }

        const uploads: Promise<unknown>[] = [
          uploadData({
            path: displayKey,
            data: displayBlob,
            options: {
              contentType: "image/webp",
              onProgress: ({ transferredBytes }) => {
                displayBytes = transferredBytes
                updateProgress()
              },
            },
          }).result,
        ]

        if (ogBlob) {
          const ogKey = `${folder}/og.webp`
          uploads.push(
            uploadData({
              path: ogKey,
              data: ogBlob,
              options: {
                contentType: "image/webp",
                onProgress: ({ transferredBytes }) => {
                  ogBytes = transferredBytes
                  updateProgress()
                },
              },
            }).result
          )
        }

        await Promise.all(uploads)
        uploadedKeys.push(displayKey)

        // Mark this entry as complete
        setUploading((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, progress: 100 } : e))
        )
      } catch (err) {
        console.error("Product image upload error:", err)
        setUploading((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, error: "Upload failed. Please try again." } : e
          )
        )
      }
    }

    // Merge new keys with existing ones and determine the new mainImage
    if (uploadedKeys.length > 0) {
      const newImages = [...images, ...uploadedKeys]
      const newMain = mainImage || uploadedKeys[0]
      onChange(newImages, newMain)
    }

    // Clean up completed entries after a short delay
    setTimeout(() => {
      setUploading((prev) =>
        prev.filter((e) => e.error !== null || e.progress < 100)
      )
    }, 1500)
  }

  // ── Regenerate og.webp from the current main image ─────────────────────────

  async function handleRegenerateOg() {
    if (!mainImage) return
    setGlobalError(null)

    // Only S3 keys can be used to regenerate (not /images/ paths)
    if (mainImage.startsWith("/")) {
      setGlobalError("Cannot regenerate OG from a public-folder image. Upload the image to S3 first.")
      return
    }

    // We need the actual image content — fetch it via resolved URL
    const resolved = resolveImageUrl(mainImage)
    try {
      const response = await fetch(resolved)
      const blob = await response.blob()
      const file = new File([blob], "main.webp", { type: "image/webp" })
      const { img, objectUrl } = await loadImage(file)
      URL.revokeObjectURL(objectUrl)

      const ogBlob = await canvasToWebpBlob(img, OG_WIDTH, OG_HEIGHT)
      const ogKey = `${folder}/og.webp`

      await uploadData({
        path: ogKey,
        data: ogBlob,
        options: { contentType: "image/webp" },
      }).result
    } catch (err) {
      console.error("OG regeneration error:", err)
      setGlobalError("Failed to regenerate OG image. Please try again.")
    }
  }

  // ── Reorder helpers ─────────────────────────────────────────────────────────

  function moveImage(index: number, direction: "up" | "down") {
    const next = [...images]
    const swapIndex = direction === "up" ? index - 1 : index + 1
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    // mainImage tracks identity, not position — no change needed
    onChange(next, mainImage)
  }

  function removeImage(index: number) {
    const key = images[index]
    const next = images.filter((_, i) => i !== index)
    // If we removed the main image, promote the first remaining one
    const newMain = key === mainImage ? (next[0] ?? "") : mainImage
    onChange(next, newMain)
  }

  function setAsMain(key: string) {
    onChange(images, key)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isUploading = uploading.some((e) => e.progress < 100 && !e.error)

  return (
    <SpaceBetween size="m">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFilesSelected}
      />

      {/* Add images button */}
      <SpaceBetween direction="horizontal" size="xs">
        <Button
          variant="normal"
          iconName="upload"
          formAction="none"
          loading={isUploading}
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? "Uploading…" : "Add images"}
        </Button>

        {mainImage && !mainImage.startsWith("/") && (
          <Button
            variant="inline-link"
            formAction="none"
            iconName="refresh"
            onClick={handleRegenerateOg}
          >
            Regenerate OG image
          </Button>
        )}
      </SpaceBetween>

      {/* Upload progress bars */}
      {uploading.map((entry) => (
        <div key={entry.id}>
          {entry.error ? (
            <Box color="text-status-error" fontSize="body-s">
              {entry.filename}: {entry.error}
            </Box>
          ) : (
            <ProgressBar
              value={entry.progress}
              label={`Uploading ${entry.filename}`}
              description={`${entry.progress}%`}
            />
          )}
        </div>
      ))}

      {/* Global error */}
      {globalError && (
        <Box color="text-status-error" fontSize="body-s">
          {globalError}
        </Box>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "12px",
          }}
        >
          {images.map((imgKey, index) => {
            const isMain = imgKey === mainImage
            const isS3Key = !imgKey.startsWith("/") && !imgKey.startsWith("http")

            return (
              <div
                key={imgKey}
                style={{
                  border: isMain ? "2px solid #0972d3" : "1px solid #aab7b8",
                  borderRadius: "6px",
                  overflow: "hidden",
                  background: "#f8f8f8",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Thumbnail */}
                <div style={{ position: "relative", height: "120px", overflow: "hidden" }}>
                  {isS3Key ? (
                    <S3Image
                      src={imgKey}
                      alt={`Product image ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "120px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveImageUrl(imgKey)}
                      alt={`Product image ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "120px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  )}

                  {/* Main badge overlay */}
                  {isMain && (
                    <div style={{ position: "absolute", top: "6px", left: "6px" }}>
                      <Badge color="blue">Main</Badge>
                    </div>
                  )}

                  {/* Remove button overlay */}
                  <div style={{ position: "absolute", top: "4px", right: "4px" }}>
                    <Button
                      variant="icon"
                      iconName="close"
                      formAction="none"
                      ariaLabel={`Remove image ${index + 1}`}
                      onClick={() => removeImage(index)}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{
                    padding: "6px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  {/* Set as main */}
                  {!isMain && (
                    <Button
                      variant="inline-link"
                      formAction="none"
                      onClick={() => setAsMain(imgKey)}
                    >
                      Set as main
                    </Button>
                  )}

                  {/* Reorder */}
                  <SpaceBetween direction="horizontal" size="xxs">
                    <Button
                      variant="icon"
                      iconName="angle-left"
                      formAction="none"
                      ariaLabel="Move left"
                      disabled={index === 0}
                      onClick={() => moveImage(index, "up")}
                    />
                    <Button
                      variant="icon"
                      iconName="angle-right"
                      formAction="none"
                      ariaLabel="Move right"
                      disabled={index === images.length - 1}
                      onClick={() => moveImage(index, "down")}
                    />
                  </SpaceBetween>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {images.length === 0 && uploading.length === 0 && (
        <Box color="text-body-secondary" fontSize="body-s">
          No images yet. Click &quot;Add images&quot; to upload.
        </Box>
      )}
    </SpaceBetween>
  )
}
