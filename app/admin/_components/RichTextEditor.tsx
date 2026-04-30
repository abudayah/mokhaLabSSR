"use client"

import React, { Suspense, lazy, useRef, useCallback, useState, useEffect, useMemo } from "react"
import type ReactQuill from "react-quill"
import { uploadData } from "aws-amplify/storage"
import DOMPurify from "dompurify"
import Textarea from "@cloudscape-design/components/textarea"
import { resolveImageUrl } from "@/lib/image-url"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  error?: string
  readOnly?: boolean
}

// "fullscreen" is a custom format registered below via Quill.register —
// it must appear in TOOLBAR_OPTIONS so Quill renders the button natively.
const TOOLBAR_OPTIONS = [
  [{ header: [2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  ["blockquote", "code-block"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link", "image"],
  ["clean"],
  ["fullscreen"], // standalone group so it can be pushed to the far right via CSS
]

// Lazy-load react-quill to avoid SSR issues.
// We also register a no-op "fullscreen" blot so Quill doesn't strip the
// toolbar button as an unknown format.
const ReactQuillLazy = lazy(() =>
  import("react-quill").then((mod) => {
    // @ts-expect-error — CSS import has no type declarations
    import("react-quill/dist/quill.snow.css").catch(() => {})

    // Register a no-op inline blot so Quill accepts "fullscreen" as a known
    // toolbar entry and renders the button without warnings.
    const Quill = mod.default.Quill ?? (mod as any).Quill
    if (Quill) {
      const Inline = Quill.import("blots/inline")
      class FullscreenBlot extends Inline {}
      FullscreenBlot.blotName = "fullscreen"
      FullscreenBlot.tagName = "span"
      Quill.register(FullscreenBlot, true)
    }

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
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isFullscreen])

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

  const fullscreenHandler = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  // Memoized so React-Quill never sees a new object reference between renders.
  // A new reference causes Quill to remount and lose cursor focus mid-typing.
  const modules = useMemo(
    () => ({
      toolbar: {
        container: TOOLBAR_OPTIONS,
        handlers: {
          image: imageHandler,
          fullscreen: fullscreenHandler,
        },
      },
    }),
    [imageHandler, fullscreenHandler]
  )

  // Sanitize Quill's HTML output before surfacing it to the parent.
  // This prevents stored XSS if the content is ever rendered via dangerouslySetInnerHTML.
  const handleChange = useCallback(
    (html: string) => {
      const clean = DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        // Allow common blog formatting; strip scripts, event handlers, etc.
      })
      onChange(clean)
    },
    [onChange]
  )

  const fallback = (
    <Textarea
      value={value}
      onChange={({ detail }) => onChange(detail.value)}
      rows={12}
      invalid={!!error}
    />
  )

  return (
    <>
      {/* Fullscreen styles declared as a React style tag — avoids imperative
          document.createElement injection which can race with Next.js hydration. */}
      <style>{`
        .ql-editor-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #fff;
          display: flex;
          flex-direction: column;
        }
        .ql-editor-fullscreen .quill {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .ql-editor-fullscreen .ql-container {
          flex: 1;
          overflow-y: auto;
        }
        .ql-editor-fullscreen .ql-editor {
          min-height: 100%;
        }
        /* Push the fullscreen group to the far right */
        .ql-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
        }
        .ql-toolbar .ql-formats:last-child {
          margin-left: auto;
        }
        /* Fullscreen button icon via CSS — swap SVG background by state */
        .ql-toolbar button.ql-fullscreen {
          width: 28px;
        }
        .ql-toolbar button.ql-fullscreen::after {
          content: "⛶";
          font-size: 16px;
          line-height: 1;
        }
        .ql-editor-fullscreen .ql-toolbar button.ql-fullscreen::after {
          content: "✕";
          font-size: 14px;
        }
      `}</style>

      <div ref={wrapperRef} className={isFullscreen ? "ql-editor-fullscreen" : undefined}>
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
              onChange={handleChange}
              modules={modules}
              theme="snow"
              readOnly={readOnly}
              style={{ minHeight: "300px" }}
            />
          </Suspense>
        </QuillErrorBoundary>

        {error && !isFullscreen && (
          <span style={{ fontSize: "12px", color: "#d91515", marginTop: "4px", display: "block" }}>
            {error}
          </span>
        )}
      </div>
    </>
  )
}
