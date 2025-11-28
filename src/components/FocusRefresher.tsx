'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function FocusRefresher() {
  const router = useRouter()

  useEffect(() => {
    const onFocus = () => {
      router.refresh()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [router])

  return null
}
