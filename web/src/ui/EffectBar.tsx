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
const ICON_PATH = '/assets/icons/effect/'

// 页面顶部居中的效果切换栏：悬停放大 + 显示名字，点击切换
export default function EffectBar({
  fxType,
  onSelect,
}: {
  fxType: string
  onSelect: (id: string) => void
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
        </div>
      ))}
      {hover && <div className="fx-tooltip">{hover}</div>}
    </div>
  )
}
