import { useState } from 'react'
import type { SocialLink } from '../api'

// 左下角社交图标：微信点击弹二维码，其他点击新窗口打开
export default function SocialBar({ socials }: { socials: SocialLink[] }) {
  const [qr, setQr] = useState<SocialLink | null>(null)
  const shown = socials.filter((s) => s.icon)

  if (shown.length === 0) return null

  return (
    <>
      <div className="social-bar">
        {shown.map((s, i) => (
          <div
            key={i}
            className="social-icon"
            title={s.name || ''}
            onClick={() => {
              if (s.type === 'wechat' || s.name === '微信') setQr(s)
              else if (s.url) window.open(s.url, '_blank')
            }}
          >
            <img src={s.icon} alt={s.name || ''} onError={(e) => ((e.target as HTMLImageElement).parentElement!.style.display = 'none')} />
          </div>
        ))}
      </div>

      {qr && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setQr(null)}>
          <div className="modal-content">
            <button className="modal-close" onClick={() => setQr(null)}>✕</button>
            <img src={qr.qrcode || qr.icon} alt="二维码" />
            <p>{qr.name || '微信'}</p>
          </div>
        </div>
      )}
    </>
  )
}
