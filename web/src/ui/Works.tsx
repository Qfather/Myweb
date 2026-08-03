import { useEffect, useRef, useState, type Ref } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { fetchWorks, type Work } from '../api'

const EASE = [0.22, 1, 0.36, 1]

// 一张全高作品卡：标题 + 描述 + 链接
function WorkCard({ work, index }: { work: Work; index: number }) {
  const desc = work.description
    ? work.description.replace(/<[^>]*>/g, '').split('\n').map((s) => s.trim()).filter(Boolean)
    : []
  return (
    <article className="wk-card" style={{ backgroundImage: work.cover ? `url(${work.cover})` : undefined }}>
      <div className="wk-card-inner">
        <span className="wk-card-no">{String(index + 1).padStart(2, '0')}</span>
        <h3 className="wk-card-title">{work.title}</h3>
        {desc.length > 0 && (
          <ul className="wk-card-points">
            {desc.slice(0, 4).map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
        {work.url && (
          <a className="wk-card-link" href={work.url} target="_blank" rel="noopener noreferrer">
            访问作品 →
          </a>
        )}
      </div>
    </article>
  )
}

export default function Works({ innerRef }: { innerRef: Ref<HTMLElement> }) {
  const [works, setWorks] = useState<Work[]>([])

  useEffect(() => {
    fetchWorks().then(setWorks)
  }, [])

  const galleryRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: galleryRef,
    offset: ['start start', 'end end'],
  })

  const [scrollRange, setScrollRange] = useState(0)
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => setScrollRange(Math.max(0, el.scrollWidth - window.innerWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [works.length])

  const x = useTransform(scrollYProgress, [0, 1], [0, -scrollRange])
  const hintOpacity = useTransform(scrollYProgress, [0.85, 1], [1, 0])

  return (
    <section className="works" ref={innerRef}>
      <div className="wk-gallery" ref={galleryRef} style={{ height: `calc(100vh + ${scrollRange}px)` }}>
        <div className="wk-gallery-sticky">
          <span className="wk-gallery-title">作品</span>

          <motion.div className="wk-track" ref={trackRef} style={{ x }}>
            {works.length > 0 ? (
              works.map((w, i) => <WorkCard key={w.id} work={w} index={i} />)
            ) : (
              <div className="wk-empty">暂无作品，敬请期待</div>
            )}
          </motion.div>

          <div className="wk-progress" aria-hidden="true">
            <motion.div className="wk-progress-fill" style={{ scaleX: scrollYProgress }} />
          </div>
          <motion.span className="wk-hint" style={{ opacity: hintOpacity }} aria-hidden="true">
            继续下滑
          </motion.span>
        </div>
      </div>
    </section>
  )
}
