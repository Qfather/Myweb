import { useEffect, useRef, useState } from 'react'
import { useThree, useLoader } from '@react-three/fiber'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import * as THREE from 'three'
import { fetchConfig } from '../api'

// 环境贴图作为光照 / 反射环境（IBL）。路径从后端配置读取（Assets/hdr/*）。
export default function Env({
  intensity,
  rotationX,
  rotationY,
  rotationZ,
  asBackground,
  bgIntensity,
  bgBlur,
}: {
  intensity: number
  rotationX: number
  rotationY: number
  rotationZ: number
  asBackground: boolean
  bgIntensity: number
  bgBlur: number
}) {
  const scene = useThree((s) => s.scene)
  const [hdrPath, setHdrPath] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig().then((cfg) => {
      setHdrPath(cfg.hdr_path || '/assets/hdr/森林.exr')
    })
  }, [])

  const texture = useLoader(
    hdrPath && hdrPath.match(/\.exr$/i) ? EXRLoader : RGBELoader,
    hdrPath || '/assets/hdr/森林.exr'
  )

  const initialBg = useRef<any>(null)
  useEffect(() => {
    initialBg.current = scene.background
  }, [scene])

  useEffect(() => {
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

  useEffect(() => {
    scene.background = asBackground ? texture : initialBg.current
    return () => {
      scene.background = initialBg.current
    }
  }, [scene, texture, asBackground])

  useEffect(() => {
    scene.backgroundIntensity = bgIntensity
    scene.backgroundBlurriness = bgBlur
  }, [scene, bgIntensity, bgBlur])

  return null
}
