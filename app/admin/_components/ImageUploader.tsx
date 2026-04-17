"use client"

import { useRef, useState, useEffect } from "react"
import { uploadData } from "aws-amplify/storage"
import Button from "@cloudscape-design/components/button"
import Box from "@cloudscape-design/components/box"
import SpaceBetween from "@cloudscape-design/components/space-between"
import ProgressBar from "@cloudscape-design/components/progress-bar"
import { S3Image } from "@/components/S3Image"

interface ImageUploaderProps {
  /** S3 path key, e.g. "blog-images/1234-photo.webp" */
  value: string | undefined
  onChange: (key: string) => void
  error?: string
}

// Display image: max 1200px wide, preserving aspect ratio
const DISPLAY_MAX_WIDTH = 1200
const DISPLAY_MAX_HEIGHT = 1200

// OG image: exactly 1200×630, center-cropped
const OG_WIDTH = 1200
const OG_HEIGHT = 630

const WEBP_QUALITY = 0.88

/**
 * Draws a source image onto a canvas at the given dimensions using
 * center-crop (cover) behaviour, then returns a WebP Blob.
 */
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

/**
 * Loads a File into an HTMLImageElement and returns both the element
 * and a local object URL (caller is responsible for revoking it).
 */
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

/**
 * Computes display dimensions: scale down proportionally so neither
 * dimension exceeds the max, but never upscale.
 */
function displayDimensions(
  naturalW: number,
  naturalH: number
): { w: number; h: number } {
  const scale = Math.min(
    1,
    DISPLAY_MAX_WIDTH / naturalW,
    DISPLAY_MAX_HEIGHT / naturalH
  )
  return { w: Math.round(naturalW * scale), h: Math.round(naturalH * scale) }
}

export default function ImageUploader({ value, onChange, error }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Revoke blob URL on change or unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image must be 10 MB or smaller.")
      return
    }

    setUploadError(null)
    setUploading(true)
    setProgress(0)

    try {
      // ── 1. Load the image ──────────────────────────────────────────────
      const { img, objectUrl } = await loadImage(file)

      // Show local preview immediately
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(objectUrl)

      // ── 2. Produce two WebP blobs via Canvas ───────────────────────────
      const { w: dispW, h: dispH } = displayDimensions(img.naturalWidth, img.naturalHeight)

      const [displayBlob, ogBlob] = await Promise.all([
        canvasToWebpBlob(img, dispW, dispH),
        canvasToWebpBlob(img, OG_WIDTH, OG_HEIGHT),
      ])

      // ── 3. Build S3 keys ───────────────────────────────────────────────
      const baseName = `${Date.now()}-${file.name
        .replace(/\.[^.]+$/, "")                  // strip original extension
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase()}`

      const displayKey = `blog-images/${baseName}.webp`
      const ogKey      = `blog-images/${baseName}-og.webp`

      // ── 4. Upload both in parallel, tracking combined progress ─────────
      let displayBytes = 0
      let ogBytes = 0
      const totalBytes = displayBlob.size + ogBlob.size

      const updateProgress = () => {
        setProgress(Math.round(((displayBytes + ogBytes) / totalBytes) * 100))
      }

      await Promise.all([
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
        }).result,
      ])

      // ── 5. Only the display key is stored in the DB ────────────────────
      // The OG key is always derived by convention: baseName-og.webp
      onChange(displayKey)
    } catch (err) {
      setUploadError("Upload failed. Please try again.")
      setPreviewUrl(null)
      console.error("Image upload error:", err)
    } finally {
      setUploading(false)
      setProgress(0)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function handleRemove() {
    onChange("")
    setPreviewUrl(null)
    setUploadError(null)
  }

  return (
    <SpaceBetween size="s">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <SpaceBetween direction="horizontal" size="xs">
        <Button
          variant="normal"
          iconName="upload"
          formAction="none"
          loading={uploading}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
        </Button>

        {value && !uploading && (
          <Button variant="inline-link" formAction="none" onClick={handleRemove}>
            Remove
          </Button>
        )}
      </SpaceBetween>

      {uploading && (
        <ProgressBar
          value={progress}
          label="Uploading image variants"
          description={`${progress}%`}
        />
      )}

      {(uploadError || error) && (
        <Box color="text-status-error" fontSize="body-s">
          {uploadError ?? error}
        </Box>
      )}

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Featured image preview"
          style={{
            maxWidth: "100%",
            maxHeight: "200px",
            objectFit: "cover",
            borderRadius: "4px",
            border: "1px solid #aab7b8",
          }}
        />
      )}

      {!previewUrl && value && (
        <S3Image
          src={value}
          alt="Featured image preview"
          style={{
            maxWidth: "100%",
            maxHeight: "200px",
            objectFit: "cover",
            borderRadius: "4px",
            border: "1px solid #aab7b8",
          }}
        />
      )}
    </SpaceBetween>
  )
}
