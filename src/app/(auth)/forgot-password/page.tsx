'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSent, setIsSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createBrowserSupabaseClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      })

      if (resetError) {
        setError('재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }

      setIsSent(true)
    } catch {
      setError('재설정 메일을 보내는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSent) {
    return (
      <div className="py-4 text-center">
        <h1 className="mb-2 text-lg font-semibold text-slate-900">메일을 보냈습니다</h1>
        <p className="text-sm leading-6 text-slate-600">
          입력한 이메일로 비밀번호 재설정 링크를 보냈습니다. 받은 편지함에서 링크를
          열어 새 비밀번호를 설정해 주세요.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          로그인으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="mb-2 text-lg font-semibold text-slate-900">비밀번호 찾기</h1>
      <p className="mb-6 text-sm leading-6 text-slate-600">
        가입한 이메일을 입력하면 비밀번호를 다시 설정할 수 있는 링크를 보내드립니다.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            이메일
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
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
          {isLoading ? '메일 보내는 중...' : '재설정 메일 보내기'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        기억나셨나요?{' '}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          로그인
        </Link>
      </p>
    </>
  )
}
