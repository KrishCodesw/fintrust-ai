"use client"

import { useState, useRef } from "react"
import { UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { type CreateCaseInput } from "@/types/case"
import { Upload, X, FileImage, Loader2 } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useAuthFetch } from "@/hooks/use-fetch"

interface Props {
  form: UseFormReturn<CreateCaseInput>
}

interface UploadedFile {
  url: string
  name: string
  size: number
}

export function StepEvidence({ form }: Props) {
  const { setValue, watch } = form
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState<UploadedFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const authFetch = useAuthFetch()

  const evidenceUrls = watch("evidenceUrls") ?? []

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)

    try {
      // Get signed upload credentials from our API
      const sigRes = await authFetch("/api/upload", { method: "POST" })
      if (!sigRes.ok) throw new Error("Could not get upload credentials")
      const { signature, timestamp, apiKey, cloudName, folder, uploadUrl } = await sigRes.json()

      const newUrls: string[] = []
      const newFiles: UploadedFile[] = []

      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} is too large. Max 10 MB per file.`)
          continue
        }

        const formData = new FormData()
        formData.append("file", file)
        formData.append("signature", signature)
        formData.append("timestamp", timestamp.toString())
        formData.append("api_key", apiKey)
        formData.append("folder", folder)

        const uploadRes = await fetch(uploadUrl, { method: "POST", body: formData })
        if (!uploadRes.ok) throw new Error(`Upload failed for ${file.name}`)
        const uploadData = await uploadRes.json()

        newUrls.push(uploadData.secure_url)
        newFiles.push({ url: uploadData.secure_url, name: file.name, size: file.size })
      }

      const allUrls = [...evidenceUrls, ...newUrls]
      setValue("evidenceUrls", allUrls)
      setUploaded((prev) => [...prev, ...newFiles])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (url: string) => {
    setValue("evidenceUrls", evidenceUrls.filter((u) => u !== url))
    setUploaded((prev) => prev.filter((f) => f.url !== url))
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Upload evidence</h2>
        <p className="text-sm text-gray-500 mt-1">
          Attach screenshots, receipts, or chat logs. Accepted: images and PDFs up to 10 MB each.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-blue-600">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm font-medium">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Upload className="h-8 w-8" />
            <p className="text-sm font-medium">Click to upload or drag and drop</p>
            <p className="text-xs">PNG, JPG, PDF up to 10 MB</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Uploaded files list */}
      {uploaded.length > 0 && (
        <div className="space-y-2">
          {uploaded.map((file) => (
            <div key={file.url} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
              <FileImage className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.url)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Evidence is optional but significantly strengthens your case.
      </p>
    </div>
  )
}
