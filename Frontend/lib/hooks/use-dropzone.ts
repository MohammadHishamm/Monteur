import { useState } from "react"
import { useDropzone as useDropzoneBase } from "react-dropzone"

export function useDropzone({
  id,
  key,
  maxSize = 20_000_000, // 20MB
}: {
  id?: string
  key: string
  maxSize?: number
}) {
  const [formData, setFormData] = useState(new FormData())
  const [formError, setFormError] = useState<string[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const dropzone = useDropzoneBase({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: maxSize,
  })

  async function onDrop(acceptedFiles: File[]) {
    const file = acceptedFiles[0]

    setFormError([])
    setPreview(URL.createObjectURL(file))

    formData.append(key, file)
  }

  return {
    dropzone,
    formData,
    setFormData,
    formError,
    setFormError,
    preview,
    setPreview,
  }
}
