'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          setError('이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해주세요.')
        } else {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        }
        return
      }
      router.push('/board')
    } catch {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <h1 className="text-lg font-semibold text-slate-900 mb-6">로그인</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">이메일</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="name@example.com" autoComplete="email" required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">비밀번호</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호 입력" autoComplete="current-password" required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}
        <button
          type="submit" disabled={isLoading}
          className="w-full mt-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500 mt-6">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="text-indigo-600 hover:text-indigo-700 font-medium">회원가입</Link>
      </p>
    </>
  )
}
