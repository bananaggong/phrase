'use client'

import React, { useState, useRef } from 'react'

export interface UploadedSongFile {
  driveFileId: string
  webViewLink: string
  originalName: string
}

export interface SongData {
  songName: string
  lyricsMode: 'file' | 'text'
  lyricsText: string
  lyricsUploaded: UploadedSongFile | null
  audioUploaded: UploadedSongFile | null
}

interface Props {
  songNumber: number
  data: SongData
  onSongNameChange: (name: string) => void
  onLyricsModeChange: (mode: 'file' | 'text') => void
  onLyricsTextChange: (text: string) => void
  onLyricsFileUpload: (file: File) => void
  onLyricsTextSave: () => void
  onAudioUpload: (file: File) => void
  isUploadingLyrics: boolean
  isUploadingAudio: boolean
  lyricsError: string | null
  audioError: string | null
}

export default function SongStep({
  songNumber,
  data,
  onSongNameChange,
  onLyricsModeChange,
  onLyricsTextChange,
  onLyricsFileUpload,
  onLyricsTextSave,
  onAudioUpload,
  isUploadingLyrics,
  isUploadingAudio,
  lyricsError,
  audioError,
}: Props) {
  const [lyricsDragOver, setLyricsDragOver] = useState(false)
  const [audioDragOver, setAudioDragOver] = useState(false)
  const [clientAudioError, setClientAudioError] = useState<string | null>(null)
  const lyricsFileRef = useRef<HTMLInputElement>(null)
  const audioFileRef = useRef<HTMLInputElement>(null)

  const ALLOWED_AUDIO_TYPES = ['audio/wav', 'audio/x-wav', 'audio/wave']
  const MAX_AUDIO_SIZE = 2 * 1024 * 1024 * 1024 // 2GB (Drive 직접 업로드)

  function handleAudioFile(file: File) {
    setClientAudioError(null)
    const isWav = ALLOWED_AUDIO_TYPES.includes(file.type) || file.name.toLowerCase().endsWith('.wav')
    if (!isWav) {
      setClientAudioError('WAV 파일만 업로드 가능합니다.')
      return
    }
    onAudioUpload(file)
  }

  const displayAudioError = clientAudioError || audioError

  return (
    <div className="flex flex-col gap-6">
      {/* 곡 이름 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          곡 이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.songName}
          onChange={e => onSongNameChange(e.target.value)}
          placeholder={`${songNumber}번 곡 이름을 입력하세요`}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* 가사 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">
            가사 <span className="text-xs text-slate-400 font-normal">(선택)</span>
          </label>
          {/* 탭 */}
          <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onLyricsModeChange('file')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                data.lyricsMode === 'file'
                  ? 'bg-white text-slate-900 shadow-sm font-medium'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              파일 업로드
            </button>
            <button
              type="button"
              onClick={() => onLyricsModeChange('text')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                data.lyricsMode === 'text'
                  ? 'bg-white text-slate-900 shadow-sm font-medium'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              직접 입력
            </button>
          </div>
        </div>

        {data.lyricsMode === 'file' ? (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setLyricsDragOver(true) }}
              onDragLeave={() => setLyricsDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setLyricsDragOver(false)
                const file = e.dataTransfer.files[0]
                if (file) onLyricsFileUpload(file)
              }}
              onClick={() => lyricsFileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                lyricsDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <input
                ref={lyricsFileRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) onLyricsFileUpload(f)
                  e.target.value = ''
                }}
              />
              {isUploadingLyrics ? (
                <p className="text-sm text-slate-500">업로드 중...</p>
              ) : data.lyricsUploaded ? (
                <div>
                  <p className="text-sm text-green-700 font-medium">업로드 완료</p>
                  <p className="text-xs text-slate-500 mt-1">{data.lyricsUploaded.originalName}</p>
                  <p className="text-xs text-slate-400 mt-1">클릭하여 교체</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-500">가사 파일을 드래그하거나 클릭하여 업로드</p>
                  <p className="text-xs text-slate-400 mt-1">TXT 파일</p>
                </div>
              )}
            </div>
            {lyricsError && <p className="mt-1.5 text-xs text-red-600">{lyricsError}</p>}
          </>
        ) : (
          <>
            <textarea
              value={data.lyricsText}
              onChange={e => onLyricsTextChange(e.target.value)}
              placeholder="가사를 입력하세요..."
              rows={6}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              {data.lyricsUploaded && (
                <p className="text-xs text-green-700">저장 완료</p>
              )}
              {lyricsError && <p className="text-xs text-red-600">{lyricsError}</p>}
              <button
                type="button"
                onClick={onLyricsTextSave}
                disabled={!data.lyricsText.trim() || isUploadingLyrics}
                className="ml-auto text-xs bg-slate-800 text-white px-3 py-1.5 rounded-md hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                {isUploadingLyrics ? '저장 중...' : '가사 저장하기'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* 곡 파일 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          곡 파일 <span className="text-xs text-slate-400 font-normal">(선택)</span>
        </label>
        <p className="text-xs text-slate-400 mb-2">WAV 파일 · 용량 제한 없음</p>
        <div
          onDragOver={e => { e.preventDefault(); setAudioDragOver(true) }}
          onDragLeave={() => setAudioDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setAudioDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) handleAudioFile(file)
          }}
          onClick={() => audioFileRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
            audioDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <input
            ref={audioFileRef}
            type="file"
            accept=".wav,audio/wav,audio/x-wav,audio/wave"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleAudioFile(f)
              e.target.value = ''
            }}
          />
          {isUploadingAudio ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">업로드 중...</p>
            </div>
          ) : data.audioUploaded ? (
            <div>
              <p className="text-sm text-green-700 font-medium">업로드 완료</p>
              <p className="text-xs text-slate-500 mt-1">{data.audioUploaded.originalName}</p>
              <p className="text-xs text-slate-400 mt-1">클릭하여 교체</p>
            </div>
          ) : (
            <div>
              <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-sm text-slate-500">곡 파일을 드래그하거나 클릭하여 업로드</p>
            </div>
          )}
        </div>
        {displayAudioError && <p className="mt-1.5 text-xs text-red-600">{displayAudioError}</p>}
      </div>
    </div>
  )
}
