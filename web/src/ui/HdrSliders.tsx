// 页面底部 HDR 调节滑块：第一行强度，第二行旋转
export default function HdrSliders({
  brightness,
  rotation,
  onBrightness,
  onRotation,
}: {
  brightness: number
  rotation: number
  onBrightness: (v: number) => void
  onRotation: (v: number) => void
}) {
  return (
    <div className="hdr-sliders">
      <div className="hdr-slider-row">
        <span className="hdr-slider-label">强度</span>
        <input
          type="range"
          min="20"
          max="200"
          value={Math.round(brightness * 100)}
          onChange={(e) => onBrightness(Number(e.target.value) / 100)}
        />
        <span className="hdr-slider-val">{brightness.toFixed(1)}</span>
      </div>
      <div className="hdr-slider-row">
        <span className="hdr-slider-label">旋转</span>
        <input
          type="range"
          min="0"
          max="360"
          value={rotation}
          onChange={(e) => onRotation(Number(e.target.value))}
        />
        <span className="hdr-slider-val">{Math.round(rotation)}°</span>
      </div>
    </div>
  )
}
