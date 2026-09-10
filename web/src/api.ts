// Flask API 客户端
// 本地：请求 /api/*；静态展示站（GitHub Pages）：读 ./data.json（由 export_static.py 生成）

async function get<T = any>(path: string): Promise<T> {
  const r = await fetch(path)
  return r.json()
}

// 静态展示模式：docs/index.html 注入 window.__STATIC__ = true
const IS_STATIC =
  typeof window !== 'undefined' && (window as any).__STATIC__ === true

let staticData: any = null
async function loadStatic(): Promise<any> {
  if (staticData) return staticData
  const r = await fetch('./data.json')
  staticData = await r.json()
  return staticData
}

export interface Profile {
  nickname: string
  avatar: string
  bio: string
  email: string
  social_links: string | SocialLink[]
}

export interface SocialLink {
  name: string
  icon: string
  url: string
  type: string
  qrcode: string
}

export interface Experience {
  id: number
  title: string
  description: string
  url: string
  text_color: string
  text_size: string
}

export interface Work {
  id: number
  title: string
  description: string
  cover: string
  url: string
  model_path: string
}

export interface SiteConfig {
  model_path?: string
  hdr_path?: string
  hdr_brightness?: string
  hdr_rotation?: string
  camera_presets?: string
  bg_mode?: string          // 'gradient' | 'hdr' | 'image'
  gradient_top?: string     // 渐变顶部颜色
  gradient_bottom?: string  // 渐变底部颜色
  bg_image?: string         // 图片背景路径
  hero_tr?: string          // 右上装饰文字
  hero_bl?: string          // 左下装饰文字
  hero_right?: string       // 右侧竖排文字
  hero_sub?: string         // 左上角副标题
  hero_frame?: string       // 边框显示 'on' | 'off'
  noise_enabled?: string
  noise_opacity?: string
  fx_type?: string          // 'none'|'noise'|'vignette'|'scanline'|'bloom'|'dof'
  fx_intensity?: string
}

export async function fetchProfile(): Promise<Profile | null> {
  try {
    if (IS_STATIC) {
      const d = await loadStatic()
      return d.profile ?? null
    }
    const r = await get<{ code: number; data: Profile }>('/api/profile')
    return r.code === 0 ? r.data : null
  } catch {
    return null
  }
}

export async function fetchExperiences(): Promise<Experience[]> {
  try {
    if (IS_STATIC) {
      const d = await loadStatic()
      return d.experiences ?? []
    }
    const r = await get<{ code: number; data: Experience[] }>('/api/favorites')
    return r.code === 0 ? r.data : []
  } catch {
    return []
  }
}

export async function fetchWorks(): Promise<Work[]> {
  try {
    if (IS_STATIC) {
      const d = await loadStatic()
      return d.works ?? []
    }
    const r = await get<{ code: number; data: Work[] }>('/api/works')
    return r.code === 0 ? r.data : []
  } catch {
    return []
  }
}

export async function fetchConfig(): Promise<SiteConfig> {
  try {
    if (IS_STATIC) {
      const d = await loadStatic()
      return d.config ?? {}
    }
    const r = await get<{ code: number; data: SiteConfig }>('/api/config')
    return r.code === 0 ? r.data : {}
  } catch {
    return {}
  }
}

export function parseSocialLinks(raw: string | SocialLink[] | undefined): SocialLink[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}
