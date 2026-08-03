import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import * as THREE from 'three'
import { fetchConfig } from '../api'

// 环境贴图作为光照 / 反射环境（IBL）。路径从后端配置读取（Assets/hdr/*），
// 按扩展名选择解析器（.exr→EXRLoader，.hdr→RGBELoader，其余→TextureLoader）。
export default function Env({
  intensity,
  rotationX,
  rotationY,
  rotationZ,
  asBackground,
  bgIntensity,
  bgBlur,
  refreshKey = 0,
}: {
  intensity: number
  rotationX: number
  rotationY: number
  rotationZ: number
  asBackground: boolean
  bgIntensity: number
  bgBlur: number
  refreshKey?: number
}) {
  const scene = useThree((s) => s.scene)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [loadedPath, setLoadedPath] = useState<string | null>(null)

  // 手动加载环境贴图（绕开 useLoader 的 loader 类型缓存问题）；refreshKey 变化时重新加载
  useEffect(() => {
    let cancelled = false
    setTexture(null)
    fetchConfig().then((cfg) => {
      const path = cfg.hdr_path || '/assets/hdr/森林.exr'
      if (cancelled) return
      let loader: any
      if (path.match(/\.exr$/i)) loader = new EXRLoader()
      else if (path.match(/\.hdr$/i)) loader = new RGBELoader()
      else loader = new THREE.TextureLoader()
      loader.load(
        path,
        (t: THREE.Texture) => {
          if (!cancelled) {
            setTexture(t)
            setLoadedPath(path)
          }
        },
        undefined,
        (err: any) => console.warn('环境贴图加载失败:', path, err?.message || err)
      )
    })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const initialBg = useRef<any>(null)
  useEffect(() => {
    initialBg.current = scene.background
  }, [scene])

  // 作为光照/反射环境
  useEffect(() => {
    if (!texture) return
    texture.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = texture
    return () => {
      scene.environment = null
    }
  }, [scene, texture])

  useEffect(() => {
    scene.environmentIntensity = intensity
  }, [scene, intensity])

  useEffect(() => {
    const x = THREE.MathUtils.degToRad(rotationX)
    const y = THREE.MathUtils.degToRad(rotationY)
    const z = THREE.MathUtils.degToRad(rotationZ)
    scene.environmentRotation.set(x, y, z)
    scene.backgroundRotation.set(x, y, z)
  }, [scene, rotationX, rotationY, rotationZ])

  // 作为可见背景（可选）
  useEffect(() => {
    scene.background = asBackground && texture ? texture : initialBg.current
    return () => {
      scene.background = initialBg.current
    }
  }, [scene, texture, asBackground])

  useEffect(() => {
    scene.backgroundIntensity = bgIntensity
    scene.backgroundBlurriness = bgBlur
  }, [scene, bgIntensity, bgBlur])

  void loadedPath
  return null
}
