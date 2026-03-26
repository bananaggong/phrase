'use client'

import React, { useState, useRef } from 'react'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 4 * 1024 * 1024 // 4MB (Vercel 4.5MB 한도 이하)

interface Props {
  uploadedFile: { thumbnailBase64?: string; originalName: string } | undefined
  isUploading: boolean
  onFileSelect: (file: File) => void
  serverError: string | null
}

export default function ImageUploadStep({ uploadedFile, isUploading, onFileSelect, serverError }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayError = localError || serverError
  const displayImage = uploadedFile?.thumbnailBase64 ?? previewUrl

  function handleFile(file: File) {
    setLocalError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setLocalError('이미지 파일만 업로드 가능합니다. (JPG, PNG, WEBP, GIF)')
      return
    }
    if (file.size > MAX_SIZE) {
      setLocalError('파일 크기는 4MB 이하여야 합니다.')
      return
    }

    // 즉시 로컬 미리보기
    const reader = new FileReader()
    reader.onload = (e) => setPreviewUrl(e.target?.result as string)
    reader.readAsDataURL(file)

    onFileSelect(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full max-w-[300px] aspect-square rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-50'
            : displayImage
            ? 'border-slate-200'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleChange}
        />

        {displayImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImage}
              alt="미리보기"
              className="w-full h-full object-cover"
            />

            {/* 업로드 중 오버레이 */}
            {isUploading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* 완료 뱃지 */}
            {uploadedFile && !isUploading && (
              <div className="absolute bottom-2 right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {/* 교체 안내 (hover) */}
            {!isUploading && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-end justify-center pb-3 opacity-0 hover:opacity-100">
                <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">클릭하여 교체</span>
              </div>
            )}
          </>
        ) : (
          /* 이미지 없음 — 기본 안내 */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            {isUploading ? (
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-slate-500 text-center">클릭하거나 드래그하여<br />이미지 업로드</p>
                <p className="text-xs text-slate-400">JPG · PNG · WEBP · GIF · 최대 4MB</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* 300x300 안내 */}
      <p className="text-xs text-slate-400">업로드 시 300 × 300 픽셀 JPEG로 자동 변환됩니다</p>

      {/* 에러 메시지 */}
      {displayError && (
        <p className="text-xs text-red-600 text-center">{displayError}</p>
      )}
    </div>
  )
}
