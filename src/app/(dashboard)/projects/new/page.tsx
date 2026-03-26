'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const STEPS = [
  { title: '1단계', description: '이 단계에 대한 설명이 여기에 들어갑니다.' },
  { title: '2단계', description: '이 단계에 대한 설명이 여기에 들어갑니다.' },
  { title: '3단계', description: '이 단계에 대한 설명이 여기에 들어갑니다.' },
  { title: '4단계', description: '이 단계에 대한 설명이 여기에 들어갑니다.' },
  { title: '5단계', description: '이 단계에 대한 설명이 여기에 들어갑니다.' },
  { title: '6단계', description: '이 단계에 대한 설명이 여기에 들어갑니다.' },
  { title: '7단계', description: '이 단계에 대한 설명이 여기에 들어갑니다.' },
  { title: '8단계', description: '이 단계에 대한 설명이 여기에 들어갑니다.' },
  { title: '9단계', description: '이 단계에 대한 설명이 여기에 들어갑니다.' },
  { title: '10단계', description: '이 단계에 대한 설명이 여기에 들어갑니다.' },
]

interface UploadedFile {
  step: number
  driveFileId: string
  webViewLink: string
  originalName: string
}

export default function NewProjectPage() {
  const router = useRouter()
  const [projectName, setProjectName] = useState('')
  const [currentStep, setCurrentStep] = useState(0) // 0-indexed (0~9)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploadingStep, setUploadingStep] = useState<number | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isLastStep = currentStep === STEPS.length - 1
  const fileForCurrentStep = uploadedFiles.find(f => f.step === currentStep + 1)

  async function ensureProjectCreated(): Promise<string> {
    if (projectId) return projectId
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName || '새 프로젝트', description: '' }),
    })
    const data = await res.json() as { projectId: string }
    setProjectId(data.projectId)
    return data.projectId
  }

  async function handleFileUpload(file: File) {
    if (!file) return
    setUploadingStep(currentStep + 1)
    setError(null)
    try {
      const pid = await ensureProjectCreated()
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/projects/${pid}/steps/${currentStep + 1}/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) { setError('파일 업로드에 실패했습니다.'); return }
      const data = await res.json() as { driveFileId: string; webViewLink: string; originalName: string; step: number }
      setUploadedFiles(prev => {
        const filtered = prev.filter(f => f.step !== currentStep + 1)
        return [...filtered, { step: currentStep + 1, driveFileId: data.driveFileId, webViewLink: data.webViewLink, originalName: data.originalName }]
      })
    } catch {
      setError('파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingStep(null)
    }
  }

  async function handleComplete() {
    setIsCompleting(true)
    setError(null)
    try {
      const pid = await ensureProjectCreated()
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json() as { email: string; name: string }
      const userLabel = meData.name || meData.email || 'user'
      const res = await fetch(`/api/projects/${pid}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectName || '새 프로젝트',
          userLabel,
          stepFiles: uploadedFiles,
        }),
      })
      if (!res.ok) { setError('완료 처리에 실패했습니다.'); return }
      router.push('/board')
    } catch {
      setError('완료 처리 중 오류가 발생했습니다.')
    } finally {
      setIsCompleting(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  return (
    <div>
      {/* 프로젝트 이름 입력 (상단) */}
      {!projectId && currentStep === 0 && (
        <div className="mb-6 bg-white rounded-lg border border-slate-200 p-5">
          <label className="text-sm font-medium text-slate-700 block mb-2">프로젝트 이름</label>
          <input
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="프로젝트 이름을 입력하세요"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      <div className="flex gap-6">
        {/* 단계 사이드바 */}
        <div className="w-48 shrink-0">
          <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col gap-1">
            {STEPS.map((step, idx) => {
              const hasFile = uploadedFiles.some(f => f.step === idx + 1)
              const isActive = idx === currentStep
              const isDone = idx < currentStep
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs text-left transition-colors ${
                    isActive ? 'bg-indigo-50 text-indigo-700 font-medium' :
                    isDone ? 'text-slate-600 hover:bg-slate-50' :
                    'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    isActive ? 'bg-indigo-600 text-white' :
                    hasFile ? 'bg-green-500 text-white' :
                    'bg-slate-200 text-slate-500'
                  }`}>
                    {hasFile && !isActive ? '✓' : idx + 1}
                  </span>
                  {step.title}
                </button>
              )
            })}
          </div>
        </div>

        {/* 단계 콘텐츠 */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-2">
            {STEPS[currentStep].title}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {STEPS[currentStep].description}
          </p>

          {/* 파일 업로드 영역 */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
            />
            {uploadingStep === currentStep + 1 ? (
              <p className="text-sm text-slate-500">업로드 중...</p>
            ) : fileForCurrentStep ? (
              <div>
                <p className="text-sm text-green-700 font-medium">업로드 완료</p>
                <p className="text-xs text-slate-500 mt-1">{fileForCurrentStep.originalName}</p>
                <p className="text-xs text-slate-400 mt-2">클릭하여 파일 교체</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-500">파일을 드래그하거나 클릭하여 업로드</p>
                <p className="text-xs text-slate-400 mt-1">선택사항 — 건너뛸 수 있습니다</p>
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

          {/* 네비게이션 버튼 */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            >
              이전
            </button>

            {isLastStep ? (
              <button
                onClick={handleComplete}
                disabled={isCompleting}
                className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isCompleting ? '처리 중...' : '시작하기'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                다음
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
