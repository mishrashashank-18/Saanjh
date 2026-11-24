import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../services/api"

interface PhotoUploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PhotoUploadModal({
  isOpen,
  onClose,
}: PhotoUploadModalProps) {
  const { user, updatePhoto, showToast, refreshUser } = useAuth()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)

  // Cloudinary settings
  const [cloudName, setCloudName] = useState<string>(
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "",
  )
  const [uploadPreset, setUploadPreset] = useState<string>(
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "saanjh_preset",
  )

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch server-configured Cloudinary settings if any
  useEffect(() => {
    if (isOpen) {
      api.users
        .getCloudinaryConfig()
        .then((res) => {
          if (res.cloudName) setCloudName(res.cloudName)
          if (res.uploadPreset) setUploadPreset(res.uploadPreset)
        })
        .catch(() => {})
    }
  }, [isOpen])

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isUploading) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isUploading, onClose])

  if (!isOpen) return null

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, or WebP).")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be less than 10MB.")
      return
    }

    setError(null)
    setSelectedFile(file)
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, or WebP).")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be less than 10MB.")
      return
    }

    setError(null)
    setSelectedFile(file)
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
  }

  async function handleUpload() {
    if (!selectedFile && !previewUrl) {
      setError("Please select an image first.")
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress("Preparing image...")

    try {
      let finalPhotoUrl = ""

      // Strategy 1: Direct Cloudinary Upload via Client API
      if (cloudName.trim() && uploadPreset.trim() && selectedFile) {
        setUploadProgress("Uploading to Cloudinary...")
        const formData = new FormData()
        formData.append("file", selectedFile)
        formData.append("upload_preset", uploadPreset.trim())
        formData.append("folder", "saanjh_profiles")

        try {
          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName.trim()}/image/upload`,
            {
              method: "POST",
              body: formData,
            },
          )

          if (res.ok) {
            const data = await res.json()
            if (data.secure_url) {
              finalPhotoUrl = data.secure_url
            }
          } else {
            const errData = await res.json().catch(() => ({}))
            console.warn(
              "Direct Cloudinary upload response not OK:",
              errData.error?.message,
            )
          }
        } catch (cldErr) {
          console.warn("Direct Cloudinary upload request failed:", cldErr)
        }
      }

      // Strategy 2: Backend Cloudinary SDK Upload (Base64)
      if (!finalPhotoUrl && selectedFile) {
        setUploadProgress("Optimizing via Saanjh Cloudinary service...")
        const base64Data = await fileToBase64(selectedFile)

        try {
          const serverRes = await api.users.uploadPhotoCloudinary(base64Data)
          if (serverRes.profilePhoto) {
            finalPhotoUrl = serverRes.profilePhoto
          }
        } catch (serverErr: any) {
          console.warn(
            "Backend Cloudinary upload route failed:",
            serverErr.message,
          )
        }
      }

      // Strategy 3: Direct update if client already has base64 data URL
      if (!finalPhotoUrl && selectedFile) {
        const base64Data = await fileToBase64(selectedFile)
        finalPhotoUrl = base64Data
      }

      if (!finalPhotoUrl) {
        throw new Error(
          "Could not process image upload. Please try another image.",
        )
      }

      setUploadProgress("Saving to your profile...")
      await updatePhoto(finalPhotoUrl)
      await refreshUser()

      showToast("Profile photo updated successfully!", "success")
      onClose()
    } catch (err: any) {
      setError(
        err.message ||
          "Failed to upload photo. Please check your connection and Cloudinary settings.",
      )
    } finally {
      setIsUploading(false)
      setUploadProgress("")
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(file)
    })
  }

  const currentDisplayPhoto =
    previewUrl ||
    user?.profilePhoto ||
    (user?.displayName?.toLowerCase().includes("shashank") ||
    user?.email?.includes("shashank")
      ? "/images/shashank.jpg"
      : "/images/shashank.jpg")

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(31, 26, 23, 0.6)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) onClose()
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 20px 50px rgba(45, 30, 20, 0.2)",
          border: "1px solid #ebd9c8",
          overflow: "hidden",
          animation: "scaleIn 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px 16px",
            borderBottom: "1px solid #f2e8df",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#fbe3d6",
                color: "#e0663c",
                padding: "3px 10px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              Cloudinary Image CDN
            </div>
            <h2
              style={{
                fontFamily: "'Newsreader', serif",
                fontSize: "24px",
                fontWeight: 600,
                margin: 0,
                color: "#1f1a17",
              }}
            >
              Add Profile Photo
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Close dialog"
            style={{
              background: "#faf6f0",
              border: "1px solid #ded6cd",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "#5d534b",
              cursor: isUploading ? "not-allowed" : "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px" }}>
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                padding: "10px 14px",
                marginBottom: "18px",
                color: "#991b1b",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Photo Preview Container */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                padding: "4px",
                background: previewUrl
                  ? "linear-gradient(135deg, #e0663c, #2f6b62)"
                  : "#ded6cd",
                boxShadow: "0 8px 24px rgba(45, 30, 20, 0.12)",
                marginBottom: "12px",
              }}
            >
              <img
                src={currentDisplayPhoto}
                alt="Profile preview"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                  background: "#f5eee6",
                }}
              />
              {previewUrl && (
                <span
                  style={{
                    position: "absolute",
                    bottom: "4px",
                    right: "4px",
                    background: "#2f6b62",
                    color: "#ffffff",
                    borderRadius: "50%",
                    width: "28px",
                    height: "28px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    border: "2px solid #ffffff",
                  }}
                  title="New photo selected"
                >
                  ✓
                </span>
              )}
            </div>

            <span style={{ fontSize: "12.5px", color: "#8c827a" }}>
              {previewUrl
                ? "Preview of your chosen photo"
                : user?.profilePhoto
                  ? "Current profile photo"
                  : "No photo uploaded yet"}
            </span>
          </div>

          {/* Drag & Drop Upload Box */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed #ded6cd",
              borderRadius: "16px",
              padding: "20px 16px",
              textAlign: "center",
              background: "#faf6f0",
              cursor: "pointer",
              transition: "border-color 0.2s ease",
              marginBottom: "18px",
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/jpg, image/webp"
              style={{ display: "none" }}
            />
            <div style={{ fontSize: "28px", marginBottom: "6px" }}>📷</div>
            <strong
              style={{
                display: "block",
                fontSize: "14.5px",
                color: "#1f1a17",
                marginBottom: "4px",
              }}
            >
              {selectedFile ? selectedFile.name : "Choose an image or drag here"}
            </strong>
            <p style={{ margin: 0, fontSize: "12px", color: "#8c827a" }}>
              PNG, JPG, or WebP up to 10MB
            </p>
          </div>

          {/* Cloudinary Info / Advanced Config Toggle */}
          <div style={{ marginBottom: "20px" }}>
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              style={{
                background: "none",
                border: "none",
                color: "#8c827a",
                fontSize: "12px",
                cursor: "pointer",
                padding: "4px 0",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>{showConfig ? "▼" : "▶"}</span>
              <span>Cloudinary CDN Settings (Optional)</span>
            </button>

            {showConfig && (
              <div
                style={{
                  background: "#fdf8f4",
                  border: "1px solid #ebd9c8",
                  borderRadius: "12px",
                  padding: "14px",
                  marginTop: "8px",
                  fontSize: "12px",
                }}
              >
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: "4px",
                      color: "#5d534b",
                    }}
                  >
                    Cloud Name
                  </label>
                  <input
                    type="text"
                    value={cloudName}
                    onChange={(e) => setCloudName(e.target.value)}
                    placeholder="e.g. demo or your-cloud-name"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #ded6cd",
                      fontSize: "12px",
                      background: "#ffffff",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 600,
                      marginBottom: "4px",
                      color: "#5d534b",
                    }}
                  >
                    Upload Preset (Unsigned)
                  </label>
                  <input
                    type="text"
                    value={uploadPreset}
                    onChange={(e) => setUploadPreset(e.target.value)}
                    placeholder="e.g. saanjh_preset"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #ded6cd",
                      fontSize: "12px",
                      background: "#ffffff",
                    }}
                  />
                </div>
                <p style={{ margin: "8px 0 0", color: "#8c827a", fontSize: "11px" }}>
                  Images will be optimized, converted to WebP, and auto-cropped to face focus via Cloudinary.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "999px",
                border: "1px solid #ded6cd",
                background: "#ffffff",
                fontSize: "14px",
                fontWeight: 600,
                color: "#6a6158",
                cursor: isUploading ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || (!selectedFile && !previewUrl)}
              style={{
                flex: 2,
                padding: "12px 20px",
                borderRadius: "999px",
                border: "none",
                background:
                  isUploading || (!selectedFile && !previewUrl)
                    ? "#ebd9c8"
                    : "var(--coral, #e0663c)",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 700,
                cursor:
                  isUploading || (!selectedFile && !previewUrl)
                    ? "not-allowed"
                    : "pointer",
                boxShadow:
                  isUploading || (!selectedFile && !previewUrl)
                    ? "none"
                    : "0 4px 14px rgba(224, 102, 60, 0.3)",
                transition: "all 0.2s ease",
              }}
            >
              {isUploading
                ? uploadProgress || "Uploading..."
                : user?.profilePhoto
                  ? "Update Photo"
                  : "Upload Photo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
