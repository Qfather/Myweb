import { useEffect, useMemo, useState } from 'react'

// 胶片划痕：随机细线在画面上偶尔闪过（CSS 动画）
export default function ScratchesOverlay({ intensity = 0.5 }: { intensity?: number }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  // 生成若干划痕线（随机位置/长度/延迟）
  const scratches = useMemo(() => {
    const n = 4 + Math.round(intensity * 6)
    return Array.from({ length: n }, (_, i) => {
      const top = Math.random() * 100
      const left = Math.random() * 100
      const len = 60 + Math.random() * 120
      const delay = Math.random() * 6
      const dur = 0.15 + Math.random() * 0.25
      const opacity = 0.15 + Math.random() * 0.35
      return { id: i, top, left, len, delay, dur, opacity }
    })
  }, [intensity])

  return (
    <div className="scratches-overlay" aria-hidden="true">
      {scratches.map((s) => (
        <span
          key={s.id}
          className="scratch-line"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.len}px`,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
    </div>
  )
}
