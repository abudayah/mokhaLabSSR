"use client"

import React, { Suspense, lazy, useRef, useCallback } from "react"
import type ReactQuill from "react-quill"
import { uploadData } from "aws-amplify/storage"
import Textarea from "@cloudscape-design/components/textarea"
import outputs from "@/amplify_outputs.json"
import { resolveImageUrl } from "@/lib/image-url"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  error?: string
  readOnly?: boolean
}



const TOOLBAR_OPTIONS = [
  [{ header: [2, 3, false] }],
  ["bold", "italic", "blockquote"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link", "image"],
]

// Lazy-load react-quill to avoid SSR issues
const ReactQuillLazy = lazy(() =>
  import("react-quill").then((mod) => {
    // @ts-expect-error — CSS import has no type declarations
    import("react-quill/dist/quill.snow.css").catch(() => {})
    return { default: mod.default }
  })
)

class QuillErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

export default function RichTextEditor({
  value,
  onChange,
  error,
  readOnly = false,
}: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return
    if (file.size > 5 * 1024 * 1024) return

    try {
      const key = `blog-images/${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, "-").toLowerCase()}`
      await uploadData({
        path: key,
        data: file,
        options: { contentType: file.type },
      }).result

      const url = resolveImageUrl(key)
      const editor = quillRef.current?.getEditor()
      if (editor) {
        const range = editor.getSelection(true)
        editor.insertEmbed(range?.index ?? 0, "image", url)
      }
    } catch (err) {
      console.error("Image upload failed:", err)
    }
  }, [])

  const imageHandler = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const modules = {
    toolbar: {
      container: TOOLBAR_OPTIONS,
      handlers: { image: imageHandler },
    },
  }

  const fallback = (
    <Textarea
      value={value}
      onChange={({ detail }) => onChange(detail.value)}
      rows={12}
      invalid={!!error}
    />
  )

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleImageUpload(file)
          e.target.value = ""
        }}
      />

      <QuillErrorBoundary fallback={fallback}>
        <Suspense
          fallback={
            <div style={{ minHeight: "300px", border: "1px solid #aab7b8", padding: "12px" }}>
              Loading editor...
            </div>
          }
        >
          <ReactQuillLazy
            ref={quillRef}
            value={value}
            onChange={onChange}
            modules={modules}
            theme="snow"
            readOnly={readOnly}
            style={{ minHeight: "300px" }}
          />
        </Suspense>
      </QuillErrorBoundary>

      {error && (
        <span style={{ fontSize: "12px", color: "#d91515", marginTop: "4px", display: "block" }}>
          {error}
        </span>
      )}
    </div>
  )
}
