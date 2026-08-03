import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchExperiences, fetchProfile, parseSocialLinks, type Experience } from '../api'

// 履历数据来自后端「个人经历」，锚点 data-point=p0..pN 与 Scene 的相机停靠点对应
interface ResumeEntry {
  period: string
  place: string
  points?: string[]
  link?: string
}

const EASE = [0.22, 1, 0.36, 1]
const containerV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
}
const itemV = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
}

// 经历 → 履历条目：title 为主题，description 按行拆分
function expToEntry(exp: Experience, i: number): ResumeEntry {
  const descLines = exp.description
    ? exp.description.replace(/<[^>]*>/g, '').split('\n').map((s) => s.trim()).filter(Boolean)
    : []
  return {
    period: `#${String(i + 1).padStart(2, '0')}`,
    place: exp.title || '经历',
    points: descLines.length > 0 ? descLines : undefined,
    link: exp.url || undefined,
  }
}

function Entry({ entry, index }: { entry: ResumeEntry; index: number }) {
  return (
    <motion.div
      className="tl-entry"
      data-point={`p${index}`}
      variants={containerV}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
    >
      <motion.span className="tl-dot" variants={itemV} aria-hidden="true" />
      <div className="tl-body">
        <motion.div className="tl-period" variants={itemV}>
          {entry.period}
        </motion.div>
        <motion.div className="tl-head" variants={itemV}>
          <h3 className="tl-place">{entry.place}</h3>
        </motion.div>
        {entry.points && (
          <motion.ul className="tl-points" variants={itemV}>
            {entry.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </motion.ul>
        )}
        {entry.link && (
          <motion.a
            className="about-link tl-link"
            href={entry.link}
            target="_blank"
            rel="noopener noreferrer"
            variants={itemV}
          >
            查看 →
          </motion.a>
        )}
      </div>
    </motion.div>
  )
}

// 社交链接块（放履历末尾）
function SocialBlock({ links }: { links: { name: string; icon: string; url: string; type: string; qrcode: string }[] }) {
  const shown = links.filter((l) => l.icon)
  if (shown.length === 0) return null
  return (
    <motion.div className="tl-entry" data-point={`p${links.length}`} variants={containerV} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-12% 0px -12% 0px' }}>
      <motion.span className="tl-dot" variants={itemV} aria-hidden="true" />
      <div className="tl-body">
        <motion.div className="tl-head" variants={itemV}>
          <h3 className="tl-place">社交</h3>
        </motion.div>
        <motion.div className="tl-logos" variants={itemV}>
          {shown.map((l, i) =>
            l.type === 'wechat' || l.name === '微信' ? (
              <span key={i} className="tl-logo" title={l.name}>
                <img src={l.icon} alt={l.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />
              </span>
            ) : (
              <a key={i} className="tl-logo" href={l.url} target="_blank" rel="noopener noreferrer" title={l.name} aria-label={l.name}>
                <img src={l.icon} alt={l.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />
              </a>
            )
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function Resume() {
  const [entries, setEntries] = useState<ResumeEntry[]>([])
  const [socials, setSocials] = useState<{ name: string; icon: string; url: string; type: string; qrcode: string }[]>([])

  useEffect(() => {
    fetchExperiences().then((list) => setEntries(list.map(expToEntry)))
    fetchProfile().then((p) => {
      if (p) setSocials(parseSocialLinks(p.social_links))
    })
  }, [])

  return (
    <section className="resume">
      <motion.h2
        className="resume-title"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        经历
      </motion.h2>
      <div className="timeline">
        {entries.map((e, i) => (
          <Entry key={i} entry={e} index={i} />
        ))}
        {socials.length > 0 && <SocialBlock links={socials} />}
      </div>
    </section>
  )
}
