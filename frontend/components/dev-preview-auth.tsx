'use client'

import { useEffect, useRef } from 'react'
import { login } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/store/authStore'

/* Dev-only auto sign-in.

   Everything under (app) reads its session out of the auth store, so opening a
   protected page in a fresh browser — or in a screenshot runner, which is a fresh
   browser every time — means filling in the sign-in form first. With
   NEXT_PUBLIC_PREVIEW_AUTH=1 this signs in once with the preview credentials instead.

   Both guards are compile-time constants that Next inlines, so in a production build
   the condition folds to false and the branch, credentials and all, is stripped. The
   flag is still worth setting to 0 in any deployed environment: treat it as a local
   convenience, not an access control. */
const PREVIEW_AUTH =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_PREVIEW_AUTH === '1'

export function DevPreviewAuth() {
  const attempted = useRef(false)

  useEffect(() => {
    if (!PREVIEW_AUTH || attempted.current) return
    if (useAuthStore.getState().isAuthenticated()) return
    attempted.current = true

    const email = process.env.NEXT_PUBLIC_PREVIEW_EMAIL
    const password = process.env.NEXT_PUBLIC_PREVIEW_PASSWORD
    if (!email || !password) {
      console.warn('[preview-auth] NEXT_PUBLIC_PREVIEW_EMAIL / _PASSWORD are not set')
      return
    }

    login({ email, password }).catch((error: unknown) => {
      console.warn('[preview-auth] sign-in failed', error)
    })
  }, [])

  return null
}

export default DevPreviewAuth
