// Flask API 客户端

async function get<T = any>(path: string): Promise<T> {
  const r = await fetch(path)
  return r.json()
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
  camera_presets?: string
  bg_mode?: string          // 'gradient' | 'hdr' | 'image'
  gradient_top?: string     // 渐变顶部颜色
  gradient_bottom?: string  // 渐变底部颜色
  bg_image?: string         // 图片背景路径
}

export async function fetchProfile(): Promise<Profile | null> {
  try {
    const r = await get<{ code: number; data: Profile }>('/api/profile')
    return r.code === 0 ? r.data : null
  } catch {
    return null
  }
}

export async function fetchExperiences(): Promise<Experience[]> {
  try {
    const r = await get<{ code: number; data: Experience[] }>('/api/favorites')
    return r.code === 0 ? r.data : []
  } catch {
    return []
  }
}

export async function fetchWorks(): Promise<Work[]> {
  try {
    const r = await get<{ code: number; data: Work[] }>('/api/works')
    return r.code === 0 ? r.data : []
  } catch {
    return []
  }
}

export async function fetchConfig(): Promise<SiteConfig> {
  try {
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
