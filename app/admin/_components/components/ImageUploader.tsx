"use client"

import { useRef, useState, useEffect } from "react"
import { uploadData } from "aws-amplify/storage"
import Button from "@cloudscape-design/components/button"
import Box from "@cloudscape-design/components/box"
import SpaceBetween from "@cloudscape-design/components/space-between"
import ProgressBar from "@cloudscape-design/components/progress-bar"
import { S3Image } from "@/components/S3Image"

interface ImageUploaderProps {
  /** S3 path key, e.g. "blog-images/1234-photo.jpg" */
  value: string | undefined
  onChange: (key: string) => void
  error?: string
}

export default function ImageUploader({ value, onChange, error }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Revoke blob URL when it changes or component unmounts to prevent memory leaks
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

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be 5MB or smaller.")
      return
    }

    setUploadError(null)
    setUploading(true)
    setProgress(0)

    // Show a local preview immediately while uploading
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)

    try {
      const key = `blog-images/${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "-").toLowerCase()}`

      await uploadData({
        path: key,
        data: file,
        options: {
          contentType: file.type,
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              setProgress(Math.round((transferredBytes / totalBytes) * 100))
            }
          },
        },
      }).result

      onChange(key)
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
          label="Uploading image"
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
