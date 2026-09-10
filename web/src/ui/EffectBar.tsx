import { useState } from 'react'

// 效果图标映射（Assets/icons/effect/ 下的图片）
const FX_ITEMS = [
  { id: 'none', name: '普通', file: '普通.png' },
  { id: 'noise', name: '胶片噪点', file: '胶片噪点.png' },
  { id: 'vignette', name: '暗角', file: '暗角.png' },
  { id: 'scanline', name: '扫描线', file: '扫描线.png' },
  { id: 'bloom', name: '辉光', file: '辉光.png' },
  { id: 'dof', name: '景深', file: '景深.png' },
  { id: 'chromatic', name: '色差', file: '色差.png' },
  { id: 'pixel', name: '像素化', file: '像素.png' },
]
// 效果图标：路径带 BASE_URL 前缀，本地(/)与静态展示站(./)均可正确解析
const ICON_PATH = `${import.meta.env.BASE_URL}assets/icons/effect/`

// 页面顶部居中的效果图标：悬停放大并在图标中心显示名字，点击切换；下方滑块调强度
export default function EffectBar({
  fxType,
  fxIntensity,
  onSelect,
  onIntensity,
}: {
  fxType: string
  fxIntensity: number
  onSelect: (id: string) => void
  onIntensity: (v: number) => void
}) {
  const [hover, setHover] = useState<string | null>(null)

  return (
    <div className="fx-bar">
      {FX_ITEMS.map((item) => (
        <div
          key={item.id}
          className={`fx-item${fxType === item.id ? ' active' : ''}`}
          onMouseEnter={() => setHover(item.name)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onSelect(item.id)}
        >
          <img src={ICON_PATH + item.file} alt={item.name} />
          {hover === item.name && <span className="fx-name">{item.name}</span>}
        </div>
      ))}
      {/* 强度滑块 */}
      <input
        className="fx-slider"
        type="range"
        min="0"
        max="100"
        value={Math.round(fxIntensity * 100)}
        onChange={(e) => onIntensity(Number(e.target.value) / 100)}
        title="强度"
      />
    </div>
  )
}
