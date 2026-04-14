'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function checkSession() {
      const supabase = createBrowserSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (isMounted) {
        setHasSession(Boolean(session))
        setIsReady(true)
      }
    }

    checkSession()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createBrowserSupabaseClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError('비밀번호를 변경하지 못했습니다. 링크가 만료되었다면 다시 요청해 주세요.')
        return
      }

      await supabase.auth.signOut()
      setIsSuccess(true)
    } catch {
      setError('비밀번호 변경 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isReady) {
    return <p className="text-sm text-slate-600">비밀번호 재설정 링크를 확인하고 있습니다.</p>
  }

  if (!hasSession) {
    return (
      <div className="py-4 text-center">
        <h1 className="mb-2 text-lg font-semibold text-slate-900">링크를 확인할 수 없습니다</h1>
        <p className="text-sm leading-6 text-slate-600">
          재설정 링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기에서 새 링크를
          다시 받아 주세요.
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          비밀번호 찾기로 이동
        </Link>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="py-4 text-center">
        <h1 className="mb-2 text-lg font-semibold text-slate-900">비밀번호 변경 완료</h1>
        <p className="text-sm text-slate-600">새 비밀번호로 다시 로그인해 주세요.</p>
        <Link
          href="/login"
          className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          로그인으로 이동
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="mb-2 text-lg font-semibold text-slate-900">새 비밀번호 설정</h1>
      <p className="mb-6 text-sm leading-6 text-slate-600">
        앞으로 로그인할 때 사용할 새 비밀번호를 입력해 주세요.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            새 비밀번호
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8자 이상"
            autoComplete="new-password"
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password-confirm" className="text-sm font-medium text-slate-700">
            새 비밀번호 확인
          </label>
          <input
            id="password-confirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="새 비밀번호 재입력"
            autoComplete="new-password"
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-1 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>
    </>
  )
}
