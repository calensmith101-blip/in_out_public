'use client'

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        // eslint-disable-next-line no-console
        console.log('Service worker registered:', reg.scope)
      }).catch(err => {
        // eslint-disable-next-line no-console
        console.warn('Service worker registration failed:', err)
      })
    }
  }, [])
  return null
}
