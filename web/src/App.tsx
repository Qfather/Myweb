import { Suspense, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { motion, AnimatePresence, useScroll, useTransform, type MotionValue } from 'framer-motion'
import * as THREE from 'three'
import Scene from './scene/Scene'
import NoiseOverlay from './ui/NoiseOverlay'
import Resume from './ui/Resume'
import Works from './ui/Works'
import LoadingScreen from './ui/LoadingScreen'
import AdminPanel from './ui/AdminPanel'
import SocialBar from './ui/SocialBar'
import { fetchProfile, fetchConfig, parseSocialLinks, type Profile, type SocialLink } from './api'

function Backdrop() {
  return (
    <mesh position={[0, 0, -40]}>
      <planeGeometry args={[600, 300]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

// 首屏 Hero：昵称 + 简介，数据来自后端
function Hero({ profile, cueOpacity }: { profile: Profile | null; cueOpacity: MotionValue<number> }) {
  const aboutRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: aboutRef,
    offset: ['start 0.6', 'start start'],
  })
  const blur = useTransform(scrollYProgress, [0, 0.5], ['blur(0px)', 'blur(16px)'])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -96])
  const bodyY = useTransform(scrollYProgress, [0, 1], [0, -52])
  const titleSpacing = useTransform(scrollYProgress, [0, 1], ['0.01em', '0.42em'])

  const bioLines = profile?.bio ? profile.bio.split('\n').filter(Boolean) : ['欢迎来到我的主页']
  if (bioLines.length === 0) bioLines.push('欢迎来到我的主页')

  return (
    <section className="hero">
      <motion.div className="about" ref={aboutRef} style={{ filter: blur, opacity }}>
        <div className="about-intro">
          <motion.h1 className="about-title" style={{ y: titleY, letterSpacing: titleSpacing }}>
            {profile?.nickname || 'Hi'}
          </motion.h1>
          {bioLines.map((p, i) => (
            <motion.p key={i} className="about-body" style={{ y: bodyY }}>
              {p}
            </motion.p>
          ))}
        </div>
      </motion.div>
      <motion.div className="scroll-cue" style={{ opacity: cueOpacity }} aria-hidden="true">
        <span className="scroll-cue-label">向下滚动</span>
        <span className="scroll-cue-track">
          <span className="scroll-cue-dot" />
        </span>
      </motion.div>
    </section>
  )
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [heroTr, setHeroTr] = useState('')
  const [heroBl, setHeroBl] = useState('')
  const [heroRight, setHeroRight] = useState('')
  const [heroSub, setHeroSub] = useState('')
  const [heroFrame, setHeroFrame] = useState('on')
  const [socials, setSocials] = useState<SocialLink[]>([])
  // 场景预览配置（实时同步到 3D 场景）
  const [preview, setPreview] = useState({
    modelPath: '/static/uploads/me_test.glb',
    hdrPath: '/assets/hdr/森林.exr',
    hdrBrightness: 1,
    hdrRotation: 0,
    bgMode: 'gradient',
    gradTop: '#0a0e16',
    gradBottom: '#20283a',
    bgImage: '',
    fxType: 'none',
    fxIntensity: 0.5,
  })
  const { scrollY } = useScroll()
  const worksRef = useRef(null)

  const reloadProfile = useCallback(() => {
    fetchProfile().then((p) => {
      setProfile(p)
      if (p) setSocials(parseSocialLinks(p.social_links))
    })
    fetchConfig().then((cfg) => {
      setHeroTr(cfg.hero_tr || '')
      setHeroBl(cfg.hero_bl || '')
      setHeroRight(cfg.hero_right || '')
      setHeroSub(cfg.hero_sub || '')
      setHeroFrame(cfg.hero_frame || 'on')
      setPreview({
        modelPath: cfg.model_path || '/static/uploads/me_test.glb',
        hdrPath: cfg.hdr_path || '/assets/hdr/森林.exr',
        hdrBrightness: cfg.hdr_brightness ? parseFloat(cfg.hdr_brightness) : 1,
        hdrRotation: cfg.hdr_rotation ? parseFloat(cfg.hdr_rotation) : 0,
        bgMode: cfg.bg_mode || 'gradient',
        gradTop: cfg.gradient_top || '#0a0e16',
        gradBottom: cfg.gradient_bottom || '#20283a',
        bgImage: cfg.bg_image || '',
        fxType: cfg.fx_type || (cfg.noise_enabled === 'on' ? 'noise' : 'none'),
        fxIntensity: cfg.fx_intensity
          ? parseFloat(cfg.fx_intensity)
          : cfg.noise_opacity
          ? parseFloat(cfg.noise_opacity)
          : 0.5,
      })
    })
  }, [])

  // 实时预览：侧边栏改动 → 立即应用到场景
  const onPreview = useCallback((partial: Partial<typeof preview>) => {
    setPreview((p) => ({ ...p, ...partial }))
  }, [])

  useEffect(() => {
    reloadProfile()
  }, [reloadProfile])

  const onSaved = useCallback(() => {
    reloadProfile()
    setRefreshKey((k) => k + 1)
  }, [reloadProfile])
  const { scrollYProgress: worksProgress } = useScroll({
    target: worksRef,
    offset: ['start end', 'start center'],
  })
  const fogBg = useTransform(
    worksProgress,
    [0, 1],
    ['rgba(8, 11, 18, 0)', 'rgba(8, 11, 18, 0.41)']
  )
  const scrimOpacity = useTransform(scrollY, [0, 520], [0, 0.4])
  const cueOpacity = useTransform(scrollY, [0, 160], [1, 0])
  const railOpacity = useTransform(scrollY, [window.innerHeight * 0.5, window.innerHeight * 1.1], [0, 1])
  const heroChromeOpacity = useTransform(scrollY, [0, 280], [1, 0])

  return (
    <>
      <LoadingScreen />

      <div className="scene-bg">
        <Canvas
          shadows={{ type: THREE.PCFShadowMap }}
          dpr={[1, 1.5]}
          camera={{ position: [0, 5, 19], fov: 39, near: 0.1, far: 500 }}
          gl={{ antialias: false, stencil: false, depth: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <color attach="background" args={['#0a0e16']} />
          <Suspense fallback={null}>
            <Backdrop />
            <Scene refreshKey={refreshKey} preview={preview} />
          </Suspense>
        </Canvas>
      </div>

      <motion.div className="scrim" style={{ opacity: scrimOpacity }} aria-hidden="true" />

      <motion.div
        className="stage-fog"
        style={{ background: fogBg }}
        aria-hidden="true"
      />

      <motion.div className="glass-rail" style={{ opacity: railOpacity }} aria-hidden="true" />

      <motion.div className="hero-chrome" style={{ opacity: heroChromeOpacity }} aria-hidden="true">
        <div className="hero-frame" style={{ display: heroFrame === 'off' ? 'none' : undefined }} />
        <span className="hero-mark tl">+</span>
        <span className="hero-mark tr">+</span>
        <span className="hero-mark bl">+</span>
        <span className="hero-mark br">+</span>
        <div className="hero-meta hm-tl">
          <span className="hm-name">{profile?.nickname || 'My'}</span>
          <span>{heroSub || 'Personal Portfolio'}</span>
        </div>
        <div className="hero-meta hm-tr">{heroTr || `Portfolio — ${new Date().getFullYear()}`}</div>
        <div className="hero-meta hm-right">{heroRight || profile?.email || ''}</div>
      </motion.div>

      {/* 左下角社交图标 */}
      <SocialBar socials={socials} />

      <NoiseOverlay enabled={preview.fxType === 'noise'} opacity={preview.fxIntensity} />

      {/* 右上角管理按钮 */}
      <button className="adm-gear" onClick={() => setAdminOpen(true)} title="管理后台" aria-label="管理后台">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      <main className="content">
        <Hero profile={profile} cueOpacity={cueOpacity} />
        <Resume refreshKey={refreshKey} />
        <Works innerRef={worksRef} refreshKey={refreshKey} />
      </main>

      {/* 右侧滑出管理面板（覆盖式） */}
      <AnimatePresence>
        {adminOpen && (
          <>
            <motion.div
              className="adm-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAdminOpen(false)}
            />
            <motion.aside
              className="adm-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <button className="adm-close" onClick={() => setAdminOpen(false)}>✕</button>
              <AdminPanel onSaved={onSaved} preview={preview} onPreview={onPreview} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
