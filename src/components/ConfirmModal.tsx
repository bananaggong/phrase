'use client'

import React from 'react'
import type { SongData } from './SongStep'

interface Props {
  albumTitle: string
  photoUploaded: boolean
  songs: SongData[]
  onClose: () => void
  onConfirm: () => void
  isConfirming: boolean
}

export default function ConfirmModal({ albumTitle, photoUploaded, songs, onClose, onConfirm, isConfirming }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">최종 확인</h2>
          <p className="text-xs text-slate-500 mb-4">생성 후에는 업로드된 내용을 수정할 수 없습니다.</p>

          {/* 경고 박스 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
            <p className="text-xs text-amber-800 leading-relaxed">
              ⚠️ 업로드된 내용은 별도 수정이 불가합니다.<br />
              아래 내용을 다시 한번 확인 후 진행해주세요.
            </p>
          </div>

          {/* 내용 요약 */}
          <div className="space-y-3 mb-6">
            {/* 앨범 정보 */}
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">앨범 제목</span>
                <span className="font-medium text-slate-900">{albumTitle || '(제목 없음)'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">앨범 커버</span>
                <span className={photoUploaded ? 'text-green-600 text-xs' : 'text-slate-400 text-xs'}>
                  {photoUploaded ? '✓ 업로드 완료' : '없음'}
                </span>
              </div>
            </div>

            {/* 수록곡 */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-600 mb-2">수록곡 ({songs.length}곡)</p>
              <div className="space-y-2">
                {songs.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-xs text-slate-700 truncate max-w-[180px]">
                      {idx + 1}. {s.songName || <span className="text-slate-400 italic">이름 없음</span>}
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${s.lyricsUploaded ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                        가사
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${s.audioUploaded ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                        곡파일
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isConfirming}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              재검토
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  생성 중...
                </span>
              ) : '확인완료'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
