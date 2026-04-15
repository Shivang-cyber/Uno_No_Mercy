import { useEffect, useState } from 'react'

const SPLASH_SEEN_KEY = 'unoNoMercy_splashSeen'

export function hasSeenSplash(): boolean {
  return localStorage.getItem(SPLASH_SEEN_KEY) === 'true'
}

export default function SplashScreen({ onDismiss }: { onDismiss: () => void }) {
  const [dismissing, setDismissing] = useState(false)

  const dismiss = () => {
    if (dismissing) return
    setDismissing(true)
    localStorage.setItem(SPLASH_SEEN_KEY, 'true')
    setTimeout(onDismiss, 900) // match slide-up duration
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        dismiss()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Touch swipe-up detection for mobile
  useEffect(() => {
    let startY: number | null = null
    const onStart = (e: TouchEvent) => { startY = e.touches[0]?.clientY ?? null }
    const onEnd = (e: TouchEvent) => {
      if (startY === null) return
      const endY = e.changedTouches[0]?.clientY ?? startY
      if (startY - endY > 60) dismiss() // swiped up 60+ px
      startY = null
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[100] cursor-pointer select-none transition-transform duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
        dismissing ? '-translate-y-full' : 'translate-y-0'
      }`}
      onClick={dismiss}
    >
      {/* Splash image */}
      <img
        src="/UNO_No_Mercy_splash.avif"
        alt="UNO No Mercy"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      {/* Gradient fade at top & bottom for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900/40 via-transparent to-ink-900/90" />

      {/* CTA bottom */}
      <div className="absolute inset-x-0 bottom-0 pb-10 sm:pb-16 flex flex-col items-center gap-3 z-10">
        <div className="animate-float">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" className="text-lotus-200 drop-shadow-lg">
            <path d="M12 4l-8 8h5v8h6v-8h5z" fill="currentColor" />
          </svg>
        </div>
        <div className="font-display text-base sm:text-lg font-bold tracking-[0.25em] text-lotus-100 drop-shadow-lg animate-soft-pulse">
          PRESS ↑ TO ENTER
        </div>
        <div className="text-xs text-lotus-300/70 tracking-wider sm:hidden">
          (or swipe up)
        </div>
      </div>
    </div>
  )
}
