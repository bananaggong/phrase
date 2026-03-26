'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (password !== passwordConfirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return }
    setIsLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error: authError } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      })
      if (authError) {
        setError(authError.message.includes('User already registered')
          ? '이미 가입된 이메일입니다.'
          : '회원가입 중 오류가 발생했습니다.')
        return
      }
      setIsSuccess(true)
    } catch {
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-4">
        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h2 className="text-base font-semibold text-slate-900 mb-2">가입 신청 완료</h2>
        <p className="text-sm text-slate-600">이메일 인증 후 로그인해주세요.</p>
        <p className="text-xs text-slate-400 mt-1">받은 편지함에서 인증 메일을 확인해주세요.</p>
        <Link href="/login" className="inline-block mt-5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">로그인으로 이동</Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-lg font-semibold text-slate-900 mb-6">회원가입</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">이메일</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">비밀번호</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상" required className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">비밀번호 확인</label>
          <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="비밀번호 재입력" required className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</p>}
        <button type="submit" disabled={isLoading} className="w-full mt-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {isLoading ? '처리 중...' : '회원가입'}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500 mt-6">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">로그인</Link>
      </p>
    </>
  )
}
