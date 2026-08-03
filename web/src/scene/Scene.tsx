import { Suspense, useMemo, useRef, useEffect, useState, type MutableRefObject } from 'react'
import { useThree, useFrame, useLoader } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing'
import * as THREE from 'three'
import Env from './Env'
import { fetchConfig, parseSocialLinks } from '../api'

// 履历节点数（由经历条数驱动），运行时由 API 数据设置
let M = 4

// ====== 程序化相机停靠点 ======
// 停靠点数量 = M(履历) + 2(首页+作品区)。s=-1 首页，s=0..M-1 履历各节点，s=M 作品区
interface CameraStop {
  pos: [number, number, number]
  target: [number, number, number]
}

let CAMERA_STOPS: CameraStop[] = [
  // 首页（远正面）
  { pos: [0, 2.2, 6.5], target: [0, 1.2, 0] },
  // 履历节点（围绕模型转动）
  { pos: [3.4, 1.6, 3.4], target: [0, 1.2, 0] },
  { pos: [3.0, 2.2, -2.6], target: [0, 1.2, 0] },
  { pos: [-3.2, 1.6, -2.4], target: [0, 1.2, 0] },
  { pos: [-3.2, 1.0, 3.0], target: [0, 1.2, 0] },
  // 作品区（近正面特写）
  { pos: [0, 1.4, 3.6], target: [0, 1.2, 0] },
]

// 解析后端 camera_presets（JSON数组：[{pos:[x,y,z],target:[x,y,z]}]）→ CameraStop[]
function parseCameraPresets(raw: string | undefined): CameraStop[] | null {
  if (!raw) return null
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(arr) || arr.length === 0) return null
    const stops = arr
      .filter((s: any) => s && Array.isArray(s.pos) && Array.isArray(s.target))
      .map((s: any) => ({
        pos: [s.pos[0], s.pos[1], s.pos[2]] as [number, number, number],
        target: [s.target[0], s.target[1], s.target[2]] as [number, number, number],
      }))
    return stops.length > 0 ? stops : null
  } catch {
    return null
  }
}

// 渐变背景球（两端颜色可调，由配置驱动）
function GradientBackground({ top = '#0a0e16', bottom = '#20283a' }: { top?: string; bottom?: string }) {
  const steep = 1.0

  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uSteep: { value: 1 },
    }),
    []
  )
  useEffect(() => {
    uniforms.uTop.value.set(top)
    uniforms.uBottom.value.set(bottom)
  }, [uniforms, top, bottom])

  return (
    <mesh scale={100}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uBottom;
          uniform float uSteep;
          varying vec3 vDir;
          void main() {
            float t = clamp(vDir.y * uSteep * 0.5 + 0.5, 0.0, 1.0);
            gl_FragColor = vec4(mix(uBottom, uTop, t), 1.0);
          }
        `}
      />
    </mesh>
  )
}

// 图片背景（普通图片铺满视口）
function ImageBackground({ path }: { path: string }) {
  const scene = useThree((s) => s.scene)
  const texture = useLoader(THREE.TextureLoader, path)
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    scene.background = texture
    return () => {
      scene.background = null
    }
  }, [scene, texture])
  return null
}

// 光源（HDR 环境 + 半球 + 主/补方向光）
function Lights({ bgMode = 'gradient', refreshKey = 0 }: { bgMode?: string; refreshKey?: number }) {
  return (
    <>
      <Env
        intensity={0.85}
        rotationX={0}
        rotationY={0}
        rotationZ={0}
        asBackground={bgMode === 'hdr'}
        bgIntensity={0.4}
        bgBlur={0}
        refreshKey={refreshKey}
      />
      <hemisphereLight args={['#ffffff', '#404040', 1.15]} />
      <directionalLight position={[5, 8, 5]} intensity={2.35} color="#ffd9c6" castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-5, 4, -4]} intensity={2.25} color="#9fc6ff" />
    </>
  )
}

// 模型 + 程序化相机（滚动驱动）+ 眼睛跟随
function Man2({
  focusRef,
  frameRef,
  modelPath,
  stopCount,
}: {
  focusRef: MutableRefObject<THREE.Vector3>
  frameRef: MutableRefObject<number>
  modelPath: string
  stopCount: number
}) {
  const scale = 2.25
  const cam = { damping: 0.1, dwell: 0.3, parallax: 3, parallaxEase: 0.1 }
  const eye = {
    enabled: true,
    gain: 3,
    maxYaw: 15,
    maxPitch: 8,
    invertX: false,
    invertY: false,
    smooth: 0.44,
  }

  const get = useThree((s) => s.get)
  const { scene } = useGLTF(modelPath)
  useGLTF.preload(modelPath)

  // 克隆模型；收集眼睛、估算头部焦点
  const { model, eyes, headCenter } = useMemo(() => {
    const clone = scene.clone(true)
    const eyes: any[] = []
    let headCenter = new THREE.Vector3(0, 1.2, 0)
    let eyeCount = 0
    let headY = 0
    clone.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        // 用包围盒估算模型中心/高度
        const box = new THREE.Box3().setFromObject(o)
        const center = box.getCenter(new THREE.Vector3())
        if (o.name === 'head' || /head/i.test(o.name)) {
          headY = center.y
        }
      }
      if (/eye/i.test(o.name)) {
        if (o.isMesh) {
          o.geometry.computeVertexNormals()
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach((m: any) => {
            m.flatShading = false
            m.needsUpdate = true
          })
        }
        eyes.push({ obj: o, base: o.quaternion.clone(), x: o.position.x })
        eyeCount++
      }
    })
    if (eyeCount > 1) {
      const xs = eyes.map((e) => e.x)
      const mid = (Math.min(...xs) + Math.max(...xs)) / 2
      eyes.forEach((e) => (e.sx = e.x < mid ? -1 : 1))
    } else {
      eyes.forEach((e) => (e.sx = 0))
    }
    if (headY) headCenter = new THREE.Vector3(0, headY, 0)
    return { model: clone, eyes, headCenter }
  }, [scene])

  // 鼠标输入
  const mouse = useRef({ x: 0, y: 0 })
  const smouse = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const isMobile = useRef(
    typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches === true || window.innerWidth <= 640)
  )

  const anchorEls = useRef<any>(null)
  const frameSmooth = useRef(0)
  const posA = useRef(new THREE.Vector3())
  const posB = useRef(new THREE.Vector3())
  const tmpEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const tmpQuat = useRef(new THREE.Quaternion())
  const desiredQuat = useRef(new THREE.Quaternion())
  const tmpVec = useRef(new THREE.Vector3())
  const paraEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const paraQuat = useRef(new THREE.Quaternion())

  const stopCountRef = useRef(stopCount)

  useFrame((_, dt) => {
    const a = 1 - Math.pow(cam.damping, dt)

    // 1) 滚动 → 连续索引 s（-1 首页 → 末停靠点 作品区）
    let sTarget = -1
    // 锚点数动态推导：页面 [data-point] 元素数 = 履历条数(+社交块)
    const anchors = document.querySelectorAll('[data-point]')
    if (anchors.length > 0 && (!anchorEls.current || anchorEls.current.length !== anchors.length)) {
      anchorEls.current = Array.from(anchors)
      // 确保停靠点足够：锚点数 + 首页 + 作品区
      const need = anchors.length + 2
      while (CAMERA_STOPS.length < need) {
        const n = CAMERA_STOPS.length - 1 // 下一个履历停靠点序号
        const angle = (n * 1.2) % (Math.PI * 2)
        CAMERA_STOPS.splice(CAMERA_STOPS.length - 1, 0, {
          pos: [Math.cos(angle) * 4.2, 1.6, Math.sin(angle) * 4.2],
          target: [0, 1.2, 0],
        })
      }
      stopCountRef.current = CAMERA_STOPS.length - 1
    }
    const els = anchorEls.current
    const d = THREE.MathUtils.clamp(cam.dwell, 0, 0.49)
    const dwell = (t: number) => {
      if (d <= 0) return t
      if (t < d) return 0
      if (t > 1 - d) return 1
      return THREE.MathUtils.smoothstep((t - d) / (1 - 2 * d), 0, 1)
    }
    if (els && els.length > 0) {
      const refLine = window.scrollY + window.innerHeight * 0.3
      const tops = els.map((el: any) => el.getBoundingClientRect().top + window.scrollY)
      if (refLine <= tops[0]) {
        const heroScroll = Math.max(1, tops[0] - window.innerHeight * 0.3)
        sTarget = -1 + dwell(THREE.MathUtils.clamp(window.scrollY / heroScroll, 0, 1))
      } else {
        sTarget = 0
        for (let i = 0; i < tops.length - 1; i++) {
          if (refLine <= tops[i + 1]) {
            sTarget = i + dwell(THREE.MathUtils.clamp((refLine - tops[i]) / Math.max(1, tops[i + 1] - tops[i]), 0, 1))
            break
          }
        }
        if (refLine >= tops[tops.length - 1]) sTarget = tops.length - 1
      }
    }
    const nStops = stopCountRef.current
    // 2) 停靠点插值：s ∈ [-1, nStops-2]，在相邻停靠点间插值 pos/target
    const sClamped = THREE.MathUtils.clamp(sTarget + 1, 0, Math.max(0, nStops - 2))
    const iA = Math.min(Math.floor(sClamped), CAMERA_STOPS.length - 2)
    const iB = Math.min(iA + 1, CAMERA_STOPS.length - 1)
    const f = sClamped - Math.floor(sClamped)
    const stops = CAMERA_STOPS
    const pA = new THREE.Vector3(stops[iA].pos[0], stops[iA].pos[1], stops[iA].pos[2])
    const pB = new THREE.Vector3(stops[iB].pos[0], stops[iB].pos[1], stops[iB].pos[2])
    const tA = new THREE.Vector3(stops[iA].target[0], stops[iA].target[1], stops[iA].target[2])
    const tB = new THREE.Vector3(stops[iB].target[0], stops[iB].target[1], stops[iB].target[2])
    posA.current.lerpVectors(pA, pB, f)
    posB.current.lerpVectors(tA, tB, f)

    // 3) 平滑 + 写入相机
    frameSmooth.current += (sClamped - frameSmooth.current) * a
    if (frameRef) frameRef.current = frameSmooth.current

    const camera: any = get().camera
    const me = 1 - Math.pow(cam.parallaxEase, dt)
    smouse.current.x += (mouse.current.x - smouse.current.x) * me
    smouse.current.y += (mouse.current.y - smouse.current.y) * me
    const ax = THREE.MathUtils.degToRad(cam.parallax)
    paraEuler.current.set(-smouse.current.y * ax, -smouse.current.x * ax, 0)
    paraQuat.current.setFromEuler(paraEuler.current)

    const desiredPos = posA.current
    tmpVec.current.copy(desiredPos).sub(focusRef.current).applyQuaternion(paraQuat.current).add(focusRef.current)
    camera.position.lerp(tmpVec.current, 0.12)
    // 朝向目标点（视线终点）
    const look = posB.current
    camera.lookAt(look)
    // 焦点跟随目标点
    focusRef.current.lerp(look, 0.06)

    // 4) 眼睛跟随
    if (!eye.enabled || eyes.length === 0 || isMobile.current) return
    const sx = eye.invertX ? -1 : 1
    const sy = eye.invertY ? -1 : 1
    let ex = 0
    let ey = 0
    for (const e of eyes) {
      e.obj.getWorldPosition(tmpVec.current).project(camera)
      ex += tmpVec.current.x
      ey += tmpVec.current.y
    }
    ex /= eyes.length
    ey /= eyes.length
    const mx = mouse.current.x - ex
    const my = mouse.current.y - ey
    const yawBase = sx * mx * THREE.MathUtils.degToRad(eye.maxYaw) * eye.gain
    const pitch = sy * -my * THREE.MathUtils.degToRad(eye.maxPitch) * eye.gain
    for (const e of eyes) {
      tmpEuler.current.set(pitch, yawBase, 0)
      tmpQuat.current.setFromEuler(tmpEuler.current)
      desiredQuat.current.copy(tmpQuat.current).multiply(e.base)
      e.obj.quaternion.slerp(desiredQuat.current, eye.smooth)
    }
  })

  return (
    <group position={[0, 0.4, -0.7]} scale={scale}>
      <primitive object={model} />
    </group>
  )
}

// 后处理：Bloom + SMAA
function Post2() {
  return (
    <EffectComposer multisampling={0} stencilBuffer={false} depthBuffer>
      <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.82} luminanceSmoothing={0.3} />
      <SMAA />
    </EffectComposer>
  )
}

// 场景根组件：模型 + 滚动驱动相机 + 眼睛跟随
export default function Scene({ refreshKey = 0 }: { refreshKey?: number }) {
  const focusRef = useRef(new THREE.Vector3(0, 1.3, 0))
  const frameRef = useRef(0)
  const [modelPath, setModelPath] = useState('/static/uploads/people_1785471786.glb')
  const [stopCount, setStopCount] = useState(4)
  const [bgMode, setBgMode] = useState('gradient')
  const [gradTop, setGradTop] = useState('#0a0e16')
  const [gradBottom, setGradBottom] = useState('#20283a')
  const [bgImage, setBgImage] = useState('')

  // 从配置读取模型路径 + 相机停靠点 + 背景设置
  useEffect(() => {
    fetchConfig().then((cfg) => {
      if (cfg.model_path) setModelPath(cfg.model_path)
      const stops = parseCameraPresets(cfg.camera_presets)
      if (stops && stops.length >= 3) {
        CAMERA_STOPS = stops
        setStopCount(stops.length - 1)
      }
      if (cfg.bg_mode) setBgMode(cfg.bg_mode)
      if (cfg.gradient_top) setGradTop(cfg.gradient_top)
      if (cfg.gradient_bottom) setGradBottom(cfg.gradient_bottom)
      if (cfg.bg_image) setBgImage(cfg.bg_image)
    })
    // 履历锚点数由 App 的数据驱动，这里默认按停靠点数
  }, [refreshKey])

  return (
    <>
      {bgMode === 'gradient' && <GradientBackground top={gradTop} bottom={gradBottom} />}
      {bgMode === 'image' && bgImage && <ImageBackground path={bgImage} />}
      <Suspense fallback={null}>
        <Lights bgMode={bgMode} refreshKey={refreshKey} />
        <Man2 focusRef={focusRef} frameRef={frameRef} modelPath={modelPath} stopCount={stopCount} />
      </Suspense>
      <Post2 />
    </>
  )
}
