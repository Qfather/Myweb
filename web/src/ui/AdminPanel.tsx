import { useEffect, useState } from 'react'
import {
  fetchProfile,
  fetchExperiences,
  fetchWorks,
  fetchConfig,
  parseSocialLinks,
  type Profile,
  type Experience,
  type Work,
  type SocialLink,
} from '../api'

// ====== 简单 API 帮助 ======
async function api(method: string, url: string, body?: any) {
  const opts: RequestInit = { method, credentials: 'include', headers: {} }
  if (body) {
    ;(opts.headers as any)['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const r = await fetch(url, opts)
  return r.json()
}

// ====== 管理面板：登录 + 各编辑区块 ======
export default function AdminPanel({ onSaved }: { onSaved: () => void }) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [pwd, setPwd] = useState('')
  const [tab, setTab] = useState<'profile' | 'exps' | 'works' | 'bg'>('profile')

  // 表单状态
  const [profile, setProfile] = useState<Profile | null>(null)
  const [exps, setExps] = useState<Experience[]>([])
  const [works, setWorks] = useState<Work[]>([])
  const [socials, setSocials] = useState<SocialLink[]>([])
  const [modelPath, setModelPath] = useState('')
  const [hdrPath, setHdrPath] = useState('')
  const [bgMode, setBgMode] = useState('gradient')
  const [gradTop, setGradTop] = useState('#0a0e16')
  const [gradBottom, setGradBottom] = useState('#20283a')

  const [msg, setMsg] = useState('')
  const [expDraft, setExpDraft] = useState({ id: 0, title: '', description: '', url: '' })
  const [workDraft, setWorkDraft] = useState({ id: 0, title: '', description: '', url: '' })

  const loadAll = () => {
    fetchProfile().then((p) => {
      if (p) {
        setProfile(p)
        setSocials(parseSocialLinks(p.social_links))
      }
    })
    fetchExperiences().then(setExps)
    fetchWorks().then(setWorks)
    fetchConfig().then((c) => {
      setModelPath(c.model_path || '')
      setHdrPath(c.hdr_path || '')
      setBgMode(c.bg_mode || 'gradient')
      setGradTop(c.gradient_top || '#0a0e16')
      setGradBottom(c.gradient_bottom || '#20283a')
    })
  }

  useEffect(() => {
    api('GET', '/admin/check').then((r) => {
      if (r.logged_in) {
        setLoggedIn(true)
        loadAll()
      }
    })
  }, [])

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 2500)
  }

  if (!loggedIn) {
    return (
      <div className="adm-login">
        <h3>管理后台</h3>
        <input
          type="password"
          placeholder="管理员密码"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doLogin()}
        />
        <button onClick={doLogin}>登录</button>
        {msg && <p className="adm-msg">{msg}</p>}
      </div>
    )
  }

  async function doLogin() {
    const r = await api('POST', '/admin/login', { password: pwd })
    if (r.code === 0) {
      setLoggedIn(true)
      loadAll()
    } else {
      setMsg('密码错误')
    }
  }

  async function logout() {
    await api('POST', '/admin/logout')
    setLoggedIn(false)
    setPwd('')
  }

  async function saveProfile() {
    if (!profile) return
    const r = await api('PUT', '/admin/profile', {
      nickname: profile.nickname,
      bio: profile.bio,
      email: profile.email,
      social_links: JSON.stringify(socials),
    })
    if (r.code === 0) {
      await api('PUT', '/admin/config', {
        model_path: modelPath,
        hdr_path: hdrPath,
        bg_mode: bgMode,
        gradient_top: gradTop,
        gradient_bottom: gradBottom,
      })
      flash('已保存')
      onSaved()
    }
  }

  async function saveExp() {
    const body = { title: expDraft.title, description: expDraft.description, url: expDraft.url }
    const r = expDraft.id
      ? await api('PUT', `/admin/favorites/${expDraft.id}`, body)
      : await api('POST', '/admin/favorites', body)
    if (r.code === 0) {
      flash('已保存')
      setExpDraft({ id: 0, title: '', description: '', url: '' })
      loadAll()
      onSaved()
    }
  }

  async function delExp(id: number) {
    await api('DELETE', `/admin/favorites/${id}`)
    loadAll()
    onSaved()
  }

  async function saveWork() {
    const body = { title: workDraft.title, description: workDraft.description, url: workDraft.url }
    const r = workDraft.id
      ? await api('PUT', `/admin/works/${workDraft.id}`, body)
      : await api('POST', '/admin/works', body)
    if (r.code === 0) {
      flash('已保存')
      setWorkDraft({ id: 0, title: '', description: '', url: '' })
      loadAll()
      onSaved()
    }
  }

  async function delWork(id: number) {
    await api('DELETE', `/admin/works/${id}`)
    loadAll()
    onSaved()
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>, kind: 'model' | 'hdr') {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const r = await (await fetch('/admin/upload', { method: 'POST', credentials: 'include', body: fd })).json()
    if (r.code === 0) {
      if (kind === 'model') setModelPath(r.data.url)
      else setHdrPath(r.data.url)
      flash('上传成功，点「保存资料」应用')
    }
  }

  return (
    <div className="adm-panel">
      <div className="adm-tabs">
        <button className={tab === 'profile' ? 'on' : ''} onClick={() => setTab('profile')}>资料</button>
        <button className={tab === 'exps' ? 'on' : ''} onClick={() => setTab('exps')}>经历</button>
        <button className={tab === 'works' ? 'on' : ''} onClick={() => setTab('works')}>作品</button>
        <button className={tab === 'bg' ? 'on' : ''} onClick={() => setTab('bg')}>背景</button>
        <button className="adm-logout" onClick={logout}>退出</button>
      </div>
      {msg && <p className="adm-msg">{msg}</p>}

      {tab === 'profile' && (
        <div className="adm-form">
          <label>昵称
            <input value={profile?.nickname || ''} onChange={(e) => setProfile({ ...(profile as Profile), nickname: e.target.value })} />
          </label>
          <label>简介
            <textarea value={profile?.bio || ''} onChange={(e) => setProfile({ ...(profile as Profile), bio: e.target.value })} rows={3} />
          </label>
          <label>邮箱
            <input value={profile?.email || ''} onChange={(e) => setProfile({ ...(profile as Profile), email: e.target.value })} />
          </label>

          <h4>社交平台</h4>
          {socials.map((s, i) => (
            <div className="adm-social-row" key={i}>
              <input value={s.name} placeholder="名称" onChange={(e) => { const ns = [...socials]; ns[i] = { ...ns[i], name: e.target.value }; setSocials(ns) }} />
              <input value={s.url} placeholder="链接" onChange={(e) => { const ns = [...socials]; ns[i] = { ...ns[i], url: e.target.value }; setSocials(ns) }} />
              <button onClick={() => setSocials(socials.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="adm-add" onClick={() => setSocials([...socials, { name: '', icon: '', url: '', type: 'link', qrcode: '' }])}>+ 添加社交</button>

          <h4>模型</h4>
          <label>GLB 路径
            <input value={modelPath} onChange={(e) => setModelPath(e.target.value)} />
          </label>
          <input type="file" accept=".glb" onChange={(e) => uploadFile(e, 'model')} />

          <button className="adm-save" onClick={saveProfile}>保存资料</button>
        </div>
      )}

      {tab === 'bg' && (
        <div className="adm-form">
          <h4>背景模式</h4>
          <div className="adm-bg-modes">
            <button className={bgMode === 'gradient' ? 'on' : ''} onClick={() => setBgMode('gradient')}>渐变背景</button>
            <button className={bgMode === 'hdr' ? 'on' : ''} onClick={() => setBgMode('hdr')}>HDR 背景</button>
          </div>

          {bgMode === 'gradient' && (
            <>
              <h4>渐变颜色</h4>
              <div className="adm-color-row">
                <label>顶部
                  <input type="color" value={gradTop} onChange={(e) => setGradTop(e.target.value)} />
                  <input value={gradTop} onChange={(e) => setGradTop(e.target.value)} />
                </label>
              </div>
              <div className="adm-color-row">
                <label>底部
                  <input type="color" value={gradBottom} onChange={(e) => setGradBottom(e.target.value)} />
                  <input value={gradBottom} onChange={(e) => setGradBottom(e.target.value)} />
                </label>
              </div>
            </>
          )}

          {bgMode === 'hdr' && (
            <>
              <h4>HDR 环境贴图</h4>
              <label>HDR 路径
                <input value={hdrPath} onChange={(e) => setHdrPath(e.target.value)} />
              </label>
              <input type="file" accept=".hdr,.exr,.png" onChange={(e) => uploadFile(e, 'hdr')} />
            </>
          )}

          <button className="adm-save" onClick={saveProfile}>保存背景</button>
        </div>
      )}

      {tab === 'exps' && (
        <div className="adm-form">
          <h4>{expDraft.id ? '编辑经历' : '添加经历'}</h4>
          <label>标题
            <input value={expDraft.title} onChange={(e) => setExpDraft({ ...expDraft, title: e.target.value })} />
          </label>
          <label>内容（Markdown / 纯文本）
            <textarea value={expDraft.description} onChange={(e) => setExpDraft({ ...expDraft, description: e.target.value })} rows={4} />
          </label>
          <label>链接
            <input value={expDraft.url} onChange={(e) => setExpDraft({ ...expDraft, url: e.target.value })} />
          </label>
          <button className="adm-save" onClick={saveExp}>保存</button>
          {expDraft.id ? <button className="adm-cancel" onClick={() => setExpDraft({ id: 0, title: '', description: '', url: '' })}>取消编辑</button> : null}
          <div className="adm-list">
            {exps.map((x) => (
              <div className="adm-item" key={x.id}>
                <span>{x.title}</span>
                <button onClick={() => setExpDraft({ id: x.id, title: x.title, description: x.description, url: x.url || '' })}>编辑</button>
                <button onClick={() => delExp(x.id)}>删</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'works' && (
        <div className="adm-form">
          <h4>{workDraft.id ? '编辑作品' : '添加作品'}</h4>
          <label>标题
            <input value={workDraft.title} onChange={(e) => setWorkDraft({ ...workDraft, title: e.target.value })} />
          </label>
          <label>描述
            <textarea value={workDraft.description} onChange={(e) => setWorkDraft({ ...workDraft, description: e.target.value })} rows={3} />
          </label>
          <label>链接
            <input value={workDraft.url} onChange={(e) => setWorkDraft({ ...workDraft, url: e.target.value })} />
          </label>
          <button className="adm-save" onClick={saveWork}>保存</button>
          {workDraft.id ? <button className="adm-cancel" onClick={() => setWorkDraft({ id: 0, title: '', description: '', url: '' })}>取消编辑</button> : null}
          <div className="adm-list">
            {works.map((w) => (
              <div className="adm-item" key={w.id}>
                <span>{w.title}</span>
                <button onClick={() => setWorkDraft({ id: w.id, title: w.title, description: w.description, url: w.url || '' })}>编辑</button>
                <button onClick={() => delWork(w.id)}>删</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
