'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUploadStep from '@/components/ImageUploadStep'
import SongStep, { SongData } from '@/components/SongStep'
import ConfirmModal from '@/components/ConfirmModal'

interface UploadedFile {
  driveFileId: string
  webViewLink: string
  originalName: string
  thumbnailBase64?: string
}

interface SongState extends SongData {
  uploadingLyrics: boolean
  uploadingAudio: boolean
  lyricsError: string | null
  audioError: string | null
}

const EMPTY_SONG: SongState = {
  songName: '',
  lyricsMode: 'file',
  lyricsText: '',
  lyricsUploaded: null,
  audioUploaded: null,
  uploadingLyrics: false,
  uploadingAudio: false,
  lyricsError: null,
  audioError: null,
}

export default function NewProjectPage() {
  const router = useRouter()
  const [albumTitle, setAlbumTitle] = useState('')
  const [currentStep, setCurrentStep] = useState(0) // 0=커버, 1~N=곡
  const [projectId, setProjectId] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<UploadedFile | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [songs, setSongs] = useState<SongState[]>([
    { ...EMPTY_SONG },
    { ...EMPTY_SONG },
    { ...EMPTY_SONG },
    { ...EMPTY_SONG },
  ])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  const totalSteps = 1 + songs.length
  const isLastStep = currentStep === totalSteps - 1
  const canComplete = songs.every(s => s.songName.trim() !== '')

  async function ensureProject(): Promise<string> {
    if (projectId) return projectId
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: albumTitle || '새 앨범', description: '' }),
    })
    const data = await res.json() as { projectId: string }
    setProjectId(data.projectId)
    return data.projectId
  }

  async function handlePhotoUpload(file: File) {
    setPhotoUploading(true)
    setPhotoError(null)
    try {
      const pid = await ensureProject()
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/projects/${pid}/steps/1/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json() as UploadedFile & { error?: string }
      if (!res.ok) { setPhotoError(data.error || '사진 업로드에 실패했습니다.'); return }
      setPhotoFile(data)
    } catch {
      setPhotoError('사진 업로드 중 오류가 발생했습니다.')
    } finally {
      setPhotoUploading(false)
    }
  }

  function updateSong(idx: number, patch: Partial<SongState>) {
    setSongs(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  async function handleLyricsFileUpload(idx: number, file: File) {
    if (!songs[idx].songName.trim()) {
      updateSong(idx, { lyricsError: '곡 이름을 먼저 입력해주세요.' })
      return
    }
    updateSong(idx, { uploadingLyrics: true, lyricsError: null })
    try {
      const pid = await ensureProject()
      const stepNum = idx + 2
      const form = new FormData()
      form.append('fileType', 'lyrics')
      form.append('songName', songs[idx].songName)
      form.append('file', file)
      const res = await fetch(`/api/projects/${pid}/steps/${stepNum}/upload`, { method: 'POST', body: form })
      const data = await res.json() as UploadedFile & { error?: string }
      if (!res.ok) { updateSong(idx, { uploadingLyrics: false, lyricsError: data.error || '업로드 실패' }); return }
      updateSong(idx, { uploadingLyrics: false, lyricsUploaded: data })
    } catch {
      updateSong(idx, { uploadingLyrics: false, lyricsError: '업로드 중 오류가 발생했습니다.' })
    }
  }

  async function handleLyricsTextSave(idx: number) {
    const song = songs[idx]
    if (!song.songName.trim()) {
      updateSong(idx, { lyricsError: '곡 이름을 먼저 입력해주세요.' })
      return
    }
    if (!song.lyricsText.trim()) return
    updateSong(idx, { uploadingLyrics: true, lyricsError: null })
    try {
      const pid = await ensureProject()
      const stepNum = idx + 2
      const form = new FormData()
      form.append('fileType', 'lyrics')
      form.append('songName', song.songName)
      form.append('lyricsText', song.lyricsText)
      const res = await fetch(`/api/projects/${pid}/steps/${stepNum}/upload`, { method: 'POST', body: form })
      const data = await res.json() as UploadedFile & { error?: string }
      if (!res.ok) { updateSong(idx, { uploadingLyrics: false, lyricsError: data.error || '저장 실패' }); return }
      updateSong(idx, { uploadingLyrics: false, lyricsUploaded: data })
    } catch {
      updateSong(idx, { uploadingLyrics: false, lyricsError: '저장 중 오류가 발생했습니다.' })
    }
  }

  async function handleAudioUpload(idx: number, file: File) {
    if (!songs[idx].songName.trim()) {
      updateSong(idx, { audioError: '곡 이름을 먼저 입력해주세요.' })
      return
    }
    updateSong(idx, { uploadingAudio: true, audioError: null })
    try {
      const pid = await ensureProject()
      const stepNum = idx + 2

      // 1단계: 서버에서 Google Drive Resumable Upload URL 받기
      const urlRes = await fetch(`/api/projects/${pid}/steps/${stepNum}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songName: songs[idx].songName }),
      })
      if (!urlRes.ok) {
        const err = await urlRes.json() as { error?: string }
        updateSong(idx, { uploadingAudio: false, audioError: err.error || '업로드 준비 실패' })
        return
      }
      const { uploadUrl, fileName } = await urlRes.json() as { uploadUrl: string; fileName: string }

      // 2단계: 파일을 Google Drive에 직접 업로드
      // Google Drive resumable upload 응답에 CORS 헤더가 없어 브라우저에서 응답을 읽지 못함
      // 업로드 자체는 성공하므로, 에러를 catch한 후 서버에서 파일 존재 여부를 확인
      let uploadOk = false
      try {
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'audio/wav' },
          body: file,
        })
        uploadOk = uploadRes.ok
      } catch {
        // CORS로 인해 응답을 읽지 못했지만 업로드는 완료됨 — confirm으로 확인
        uploadOk = true
      }

      if (!uploadOk) {
        updateSong(idx, { uploadingAudio: false, audioError: '업로드에 실패했습니다.' })
        return
      }

      // 3단계: 서버에서 Drive 파일 ID 확인
      const confirmRes = await fetch(`/api/projects/${pid}/steps/${stepNum}/audio-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
      })
      const confirmData = await confirmRes.json() as { driveFileId?: string; webViewLink?: string; error?: string }
      if (!confirmRes.ok) {
        updateSong(idx, { uploadingAudio: false, audioError: confirmData.error || '업로드 확인 실패' })
        return
      }

      const driveFileId = confirmData.driveFileId!
      const webViewLink = confirmData.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`

      updateSong(idx, {
        uploadingAudio: false,
        audioUploaded: { driveFileId, webViewLink, originalName: fileName },
      })
    } catch {
      updateSong(idx, { uploadingAudio: false, audioError: '업로드 중 오류가 발생했습니다.' })
    }
  }

  function addSong() {
    setSongs(prev => [...prev, { ...EMPTY_SONG }])
  }

  async function handleComplete() {
    setIsCompleting(true)
    try {
      const pid = await ensureProject()
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json() as { email: string; name: string }
      const userLabel = meData.name || meData.email || 'user'

      const stepFiles = [
        ...(photoFile ? [{ step: 1, driveFileId: photoFile.driveFileId, webViewLink: photoFile.webViewLink, originalName: photoFile.originalName }] : []),
        ...songs.flatMap((s, idx) => {
          const stepNum = idx + 2
          const files = []
          if (s.lyricsUploaded) files.push({ step: stepNum, driveFileId: s.lyricsUploaded.driveFileId, webViewLink: s.lyricsUploaded.webViewLink, originalName: s.lyricsUploaded.originalName })
          if (s.audioUploaded) files.push({ step: stepNum, driveFileId: s.audioUploaded.driveFileId, webViewLink: s.audioUploaded.webViewLink, originalName: s.audioUploaded.originalName })
          return files
        }),
      ]

      const res = await fetch(`/api/projects/${pid}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: albumTitle || '새 앨범', userLabel, stepFiles }),
      })
      if (!res.ok) { alert('생성에 실패했습니다.'); return }
      router.push('/board')
    } catch {
      alert('생성 중 오류가 발생했습니다.')
    } finally {
      setIsCompleting(false)
      setShowConfirmModal(false)
    }
  }

  const songIdx = currentStep - 1 // 곡 단계에서 songs 배열 인덱스

  return (
    <div>
      {/* 앨범 제목 */}
      {currentStep === 0 && (
        <div className="mb-6 bg-white rounded-lg border border-slate-200 p-5">
          <label className="text-sm font-medium text-slate-700 block mb-2">앨범 제목</label>
          <input
            value={albumTitle}
            onChange={e => setAlbumTitle(e.target.value)}
            placeholder="앨범 제목을 입력하세요"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      <div className="flex gap-6">
        {/* 사이드바 */}
        <div className="w-52 shrink-0">
          <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col gap-1">
            {/* 앨범 커버 */}
            <button
              onClick={() => setCurrentStep(0)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs text-left transition-colors ${
                currentStep === 0 ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                currentStep === 0 ? 'bg-indigo-600 text-white' : photoFile ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {photoFile && currentStep !== 0 ? '✓' : '1'}
              </span>
              앨범 커버
            </button>

            {/* 곡 단계들 */}
            {songs.map((s, idx) => {
              const stepIdx = idx + 1
              const isActive = currentStep === stepIdx
              const hasSongName = s.songName.trim() !== ''
              const hasContent = s.lyricsUploaded || s.audioUploaded
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(stepIdx)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs text-left transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    isActive ? 'bg-indigo-600 text-white' : hasContent ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {hasContent && !isActive ? '✓' : idx + 2}
                  </span>
                  <span className="truncate">{hasSongName ? s.songName : `${idx + 1}번 곡`}</span>
                </button>
              )
            })}

            {/* 곡 추가 */}
            <button
              onClick={addSong}
              className="flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors mt-1"
            >
              <span className="w-5 h-5 rounded-full border border-dashed border-indigo-400 flex items-center justify-center text-xs shrink-0">+</span>
              곡 추가하기
            </button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 p-6">
          {currentStep === 0 ? (
            <>
              <h2 className="text-base font-semibold text-slate-900 mb-1">앨범 커버</h2>
              <p className="text-sm text-slate-500 mb-6">300 × 300 픽셀 정사각형 이미지를 업로드해주세요.</p>
              <ImageUploadStep
                uploadedFile={photoFile ?? undefined}
                isUploading={photoUploading}
                onFileSelect={handlePhotoUpload}
                serverError={photoError}
              />
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-slate-900 mb-1">{songIdx + 1}번 곡</h2>
              <p className="text-sm text-slate-500 mb-6">곡 이름, 가사, 곡 파일을 업로드해주세요.</p>
              <SongStep
                songNumber={songIdx + 1}
                data={songs[songIdx]}
                onSongNameChange={name => updateSong(songIdx, { songName: name })}
                onLyricsModeChange={mode => updateSong(songIdx, { lyricsMode: mode })}
                onLyricsTextChange={text => updateSong(songIdx, { lyricsText: text })}
                onLyricsFileUpload={file => handleLyricsFileUpload(songIdx, file)}
                onLyricsTextSave={() => handleLyricsTextSave(songIdx)}
                onAudioUpload={file => handleAudioUpload(songIdx, file)}
                isUploadingLyrics={songs[songIdx].uploadingLyrics}
                isUploadingAudio={songs[songIdx].uploadingAudio}
                lyricsError={songs[songIdx].lyricsError}
                audioError={songs[songIdx].audioError}
              />
            </>
          )}

          {/* 네비게이션 */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            >
              이전
            </button>

            {isLastStep ? (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={!canComplete}
                className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                생성완료
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(s => Math.min(totalSteps - 1, s + 1))}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                다음
              </button>
            )}
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <ConfirmModal
          albumTitle={albumTitle || '새 앨범'}
          photoUploaded={!!photoFile}
          songs={songs}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleComplete}
          isConfirming={isCompleting}
        />
      )}
    </div>
  )
}
