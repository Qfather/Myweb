/**
 * 个人3D主页 - Three.js 场景
 * 
 * 交互：
 *   idle（自由观察） → 点击 → viewing（导览：面板 + 镜头 + 动画）
 *   viewing → 滚轮 → 切换镜头 + 对应动画 + 文字滑入
 *   viewing → 点击 → 回到 idle
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

// ====== 加载进度条 ======
const loaderEl=document.getElementById('loader');
const loaderFill=document.getElementById('loader-fill');
let loadProgress=0;
function setLoadProgress(p){loadProgress=Math.max(loadProgress,p);loaderFill.style.width=loadProgress+'%';}
function hideLoader(){loaderEl.classList.add('hidden');setTimeout(()=>{if(loaderEl.parentNode)loaderEl.parentNode.removeChild(loaderEl);},600);}

const container = document.getElementById('scene-container');
const scene = new THREE.Scene();
// 背景由 CSS 控制，贴图加载完成后替换

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 4.5);
const lookTarget = new THREE.Vector3(0, 0.6, 0);
camera.lookAt(lookTarget);

const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, powerPreference:'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0); // 透明背景，CSS灰色透出
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// ====== 自由观察控制器 ======
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2; controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI / 2;
controls.target.set(0, 0.6, 0);
controls.update();

// ====== 灯光 ======
scene.add(new THREE.AmbientLight(0x404060, 0.5));
const ml = new THREE.DirectionalLight(0xffffff, 2.5); ml.position.set(5,8,5); ml.castShadow=true; scene.add(ml);
const fl = new THREE.DirectionalLight(0x6c5ce7, 0.8); fl.position.set(-3,2,4); scene.add(fl);
scene.add(new THREE.DirectionalLight(0xfd79a8, 0.4).position.set(0,-2,-5));
scene.add(new THREE.HemisphereLight(0x6c5ce7, 0x0a0a0f, 0.3));

// ====== 粒子星空 ======
let particles;
(function(){
const N=2000, p=new Float32Array(N*3), c=new Float32Array(N*3);
for(let i=0;i<N;i++){const r=10+20*Math.random(),t=2*Math.PI*Math.random(),q=Math.acos(2*Math.random()-1);
p[i*3]=r*Math.sin(q)*Math.cos(t);p[i*3+1]=r*Math.cos(q)*0.3;p[i*3+2]=r*Math.sin(q)*Math.sin(t);
const col=new THREE.Color().setHSL(0.65+Math.random()*0.15,0.6,0.4+Math.random()*0.3);
c[i*3]=col.r;c[i*3+1]=col.g;c[i*3+2]=col.b;}
const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));
particles=new THREE.Points(g,new THREE.PointsMaterial({size:0.08,vertexColors:true,transparent:true,opacity:0.6,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
scene.add(particles);
})();
const fg=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshBasicMaterial({color:0x6c5ce7,transparent:true,opacity:0.04,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
fg.rotation.x=-Math.PI/2;fg.position.y=-0.6;scene.add(fg);

// ====== 环境贴图（HDR/PNG） ======
(async()=>{
 setLoadProgress(10);
 const progressTimer=setInterval(()=>{
  const cur=parseFloat(loaderFill.style.width);
  if(cur<85)setLoadProgress(cur+3+Math.random()*7);
 },300);
 // 强制超时退出，最多等 3.5 秒
 const forceTimeout=setTimeout(()=>{
  clearInterval(progressTimer);
  setLoadProgress(100);
  setTimeout(hideLoader,200);
 },3500);
 try{
  const r=await(await fetch('/api/config')).json();
  setLoadProgress(25);
  let path='';
  let brightness=1.0;
  if(r.code===0){
   path=r.data?.hdr_path||'/assets/hdr/森林.exr';
   brightness=r.data?.hdr_brightness?parseFloat(r.data.hdr_brightness):1.0;
  }else{path='/assets/hdr/森林.exr';}
  container.style.filter='brightness('+brightness+')';
  const loadTex=(loader,url)=>new Promise((res,rej)=>loader.load(url,res,undefined,rej));
  setLoadProgress(40);
  let tex=null;
  try{
   if(path.match(/\.hdr$/i)) tex=await loadTex(new RGBELoader(),path);
   else if(path.match(/\.exr$/i)) tex=await loadTex(new EXRLoader(),path);
   else tex=await loadTex(new THREE.TextureLoader(),path);
  }catch(e){console.warn('HDR加载失败:',e.message);}
  clearInterval(progressTimer);
  clearTimeout(forceTimeout);
  if(tex){
   tex.mapping=THREE.EquirectangularReflectionMapping;
   scene.background=tex;
   scene.environment=tex;
  }
  setLoadProgress(100);
  setTimeout(hideLoader,200);
 }catch(e){console.warn('加载出错:',e.message);setTimeout(hideLoader,200);}
})();

// ====== 占位模型 ======
let modelGroup=null;
(function(){
const g=new THREE.Group();
const h=new THREE.Mesh(new THREE.SphereGeometry(0.5,32,32),new THREE.MeshPhysicalMaterial({color:0x2d2d44,metalness:0.1,roughness:0.3,emissive:0x6c5ce7,emissiveIntensity:0.05,clearcoat:0.4}));
h.position.y=1;h.castShadow=true;g.add(h);
const b=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.5,0.6,16),new THREE.MeshPhysicalMaterial({color:0x1a1a2e,metalness:0.2,roughness:0.4,emissive:0x6c5ce7,emissiveIntensity:0.02}));
b.position.y=0.5;b.castShadow=true;g.add(b);
const em=new THREE.MeshBasicMaterial({color:0x6c5ce7}),eg=new THREE.SphereGeometry(0.06,8,8);
for(const s of[-1,1]){const e=new THREE.Mesh(eg,em);e.position.set(s*0.18,1.1,0.45);g.add(e);}
const ri=new THREE.Mesh(new THREE.TorusGeometry(0.52,0.015,16,48),new THREE.MeshBasicMaterial({color:0x6c5ce7,transparent:true,opacity:0.3,blending:THREE.AdditiveBlending}));
ri.position.y=1;ri.rotation.x=Math.PI/2;g.add(ri);
const N=150,pg=new THREE.BufferGeometry(),pp=new Float32Array(N*3);
for(let i=0;i<N;i++){const a=i/N*2*Math.PI,r=0.9+0.3*Math.random();pp[i*3]=Math.cos(a)*r;pp[i*3+1]=0.9+Math.sin(a*3)*0.15;pp[i*3+2]=Math.sin(a)*r;}
pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
g.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0xa29bfe,size:0.02,transparent:true,opacity:0.5,blending:THREE.AdditiveBlending})));
modelGroup=g;scene.add(g);
})();

// ====== GLB 加载 ======
const loader=new GLTFLoader(),dracoLoader=new DRACOLoader();
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
loader.setDRACOLoader(dracoLoader);

async function loadModel(url){
 if(!url)return;
 try{
  const gltf=await loader.loadAsync(url),m=gltf.scene;
  const box=new THREE.Box3().setFromObject(m),s=box.getSize(new THREE.Vector3());
  const scale=1.8/Math.max(s.x,s.y,s.z);m.scale.setScalar(scale);
  const c=box.getCenter(new THREE.Vector3());m.position.set(0,0.6-c.y*scale,0);
  m.updateMatrixWorld(true);
  m.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
  if(modelGroup){scene.remove(modelGroup);modelGroup.traverse(c=>{if(c.geometry)c.geometry.dispose();if(c.material){if(Array.isArray(c.material))c.material.forEach(m=>m.dispose());else c.material.dispose();}});}
  modelGroup=m;scene.add(modelGroup);
  extractCamerasFromGLB(m);
  setupAnimations(gltf,m);
  // 保存动画名到服务器
  if(gltf.animations&&gltf.animations.length>0){
   const names=gltf.animations.map(a=>a.name||'未命名');
   try{await fetch('/admin/config',{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({glb_animations:JSON.stringify(names)})});}catch{}
  }
  // 同时保存镜头预设（含默认 animIdx）
  if(CAMERA_PRESETS.length>0){
   try{await fetch('/admin/config',{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({camera_presets:JSON.stringify(CAMERA_PRESETS)})});}catch{}
  }
 }catch(e){console.warn('模型加载失败:',e.message);}
}

// ====== 动画系统（多Clip） ======
let mixer=null;
let animClips=[];      // AnimationClip 列表

function setupAnimations(gltf,root){
 if(!gltf.animations||gltf.animations.length===0){console.log('GLB 无动画');return;}
 mixer=new THREE.AnimationMixer(root);
 animClips=gltf.animations;
 console.log(`GLB 包含 ${animClips.length} 个动画`);
}

/** 播放指定索引的动画。单帧=静态Pose，多帧=循环播放 */
function playAnimation(animIdx){
 if(!mixer||animClips.length===0)return;
 const idx=animIdx%animClips.length;
 mixer.stopAllAction();
 const clip=animClips[idx];
 const action=mixer.clipAction(clip);
 // 判断是否多帧
 const hasMultipleFrames=clip.tracks.some(t=>t.times.length>1);
 if(hasMultipleFrames){
  action.setLoop(THREE.LoopRepeat);
  action.clampWhenFinished=false;
 }else{
  action.setLoop(THREE.LoopOnce);
  action.clampWhenFinished=true;
 }
 action.reset();
 // 立即求值到第0帧
 action.time=0;
 action.play();
 mixer.update(0);
 // 多帧循环动画需要持续播放，单帧只需一帧
 if(!hasMultipleFrames){mixer.update(0);}
 return hasMultipleFrames; // 返回是否循环动画
}

function extractCamerasFromGLB(root){
 const cams=[];
 root.traverse(n=>{
  if(n.isCamera){
   const wp=new THREE.Vector3();n.getWorldPosition(wp);
   const d=new THREE.Vector3(0,0,-1),wq=new THREE.Quaternion();n.getWorldQuaternion(wq);d.applyQuaternion(wq);
   const t=wp.clone().add(d.multiplyScalar(3));
   cams.push({pos:[wp.x,wp.y,wp.z],target:[t.x,t.y,t.z],animIdx:0});
  }
 });
 if(cams.length>0){CAMERA_PRESETS=cams;currentViewIndex=0;}
}
(async()=>{try{const r=await(await fetch('/api/config')).json();if(r.code===0&&r.data?.model_path)await loadModel(r.data.model_path);}catch{}})();

// ====== 镜头预设 ======
let CAMERA_PRESETS=[
 {pos:[0,1.5,4.5],target:[0,0.6,0],animIdx:0},
 {pos:[3.0,1.2,3.0],target:[0,0.6,0],animIdx:1},
 {pos:[-2.8,3.0,3.0],target:[0,0.6,0],animIdx:2},
 {pos:[0,0.8,2.8],target:[0,0.6,0],animIdx:3},
];
let currentViewIndex=0;
let isTransitioning=false;
let transitionProgress=0;
let fromPos=new THREE.Vector3(),fromTarget=new THREE.Vector3();
let toPos=new THREE.Vector3(),toTarget=new THREE.Vector3();
let currentAnimLooping=false;

// 从服务端加载镜头配置
(async()=>{
 try{
  const r=await(await fetch('/api/config')).json();
  if(r.code===0&&r.data?.camera_presets){
   const p=typeof r.data.camera_presets==='string'?JSON.parse(r.data.camera_presets):r.data.camera_presets;
   if(Array.isArray(p)&&p.length>0){CAMERA_PRESETS=p;currentViewIndex=0;}
  }
 }catch{}
})();

function switchToView(index){
 if(isTransitioning||index===currentViewIndex)return;
 const p=CAMERA_PRESETS[index];
 fromPos.copy(camera.position);fromTarget.copy(lookTarget);
 toPos.set(p.pos[0],p.pos[1],p.pos[2]);toTarget.set(p.target[0],p.target[1],p.target[2]);
 isTransitioning=true;transitionProgress=0;currentViewIndex=index;
 // 播放对应动画
 const animIdx=p.animIdx!==undefined?p.animIdx:index;
 currentAnimLooping=playAnimation(animIdx)||false;
}

// ====== 面板 & 文字（从API加载经历） ======
const panel=document.getElementById('text-panel'),textEl=document.getElementById('text-line');
let LINES=['加载中...'];
let idle=true,lineIndex=0,isTextAnimating=false;

/** 加载经历文本（完整数据：标题、描述、链接） */
let experiencesData = [];

async function loadExperiences() {
    try {
        const r = await(await fetch('/api/favorites')).json();
        if (r.code === 0 && r.data.length > 0) {
            experiencesData = r.data;
        } else {
            experiencesData = [{ id:0, title:'欢迎来到我的个人主页', description:'', url:'' }];
        }
    } catch { experiencesData = [{ id:0, title:'欢迎来到我的个人主页', description:'', url:'' }]; }
}

function setContentWithSlide(data) {
    if(isTextAnimating)return; isTextAnimating=true;
    // WYSIWYG：直接显示编辑器中保存的 HTML
    const content = data.description || '<h1></h1><p></p>';
    if(panel.classList.contains('visible')){
        textEl.classList.remove('slide-in');textEl.classList.add('slide-out');
        setTimeout(()=>{textEl.innerHTML=content;textEl.classList.remove('slide-out');void textEl.offsetWidth;textEl.classList.add('slide-in');isTextAnimating=false;},500);
    }else{textEl.innerHTML=content;panel.classList.add('visible');void textEl.offsetWidth;textEl.classList.add('slide-in');isTextAnimating=false;}
}

loadExperiences();

// ====== 左上角个人资料 ======
async function loadProfileTop() {
    try {
        const r = await (await fetch('/api/profile')).json();
        if (r.code !== 0) return;
        const d = r.data;
        document.getElementById('nickname-top').textContent = d.nickname || '访客';
        document.getElementById('bio-top').textContent = d.bio || '';
        if (d.avatar) document.getElementById('avatar-top').src = d.avatar;
    } catch {}
}
loadProfileTop();

// ====== 社交图标 ======
async function loadSocialLinks() {
    try {
        const r = await (await fetch('/api/profile')).json();
        if (r.code !== 0) return;
        const raw = r.data.social_links;
        let links = [];
        if (typeof raw === 'string') { try { links = JSON.parse(raw); } catch { return; } }
        else if (Array.isArray(raw)) links = raw;
        else return;
        // 兼容旧路径
        links = links.map(item => ({
            ...item,
            icon: (item.icon||'').replace('/static/icons/','/assets/icons/'),
            qrcode: (item.qrcode||'').replace('/static/icons/','/assets/icons/'),
        }));
        const bar = document.getElementById('social-bar');
        if (!bar || links.length === 0) return;
        bar.innerHTML = links.map((item, i) => {
            const isWechat = item.type === 'wechat' || item.name === '微信';
            return `<div class="social-icon" data-index="${i}" title="${item.name || ''}" style="cursor:pointer">
                <img src="${item.icon || ''}" alt="${item.name || ''}" onerror="this.parentElement.style.display='none'">
            </div>`;
        }).join('');
        // 点击事件
        bar.querySelectorAll('.social-icon').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.index);
                const item = links[idx];
                if (!item) return;
                if (item.type === 'wechat' || item.name === '微信') {
                    // 弹二维码
                    const modal = document.getElementById('qrcode-modal');
                    document.getElementById('qrcode-img').src = item.qrcode || item.icon || '';
                    document.getElementById('qrcode-label').textContent = item.name || '微信';
                    modal.classList.remove('hidden');
                } else if (item.url) {
                    window.open(item.url, '_blank');
                }
            });
        });
    } catch {}
}
loadSocialLinks();

// 二维码弹窗关闭
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('qrcode-close');
    const modal = document.getElementById('qrcode-modal');
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    }
});

function enterViewing(){
 if(!idle)return;idle=false;controls.enabled=false;renderer.domElement.style.cursor='pointer';
 currentViewIndex=0;lineIndex=0;
 loadExperiences().then(()=>{
  switchToView(0);
  setContentWithSlide(experiencesData[0]||{title:''});
  lineIndex=1;
 });
}
function exitViewing(){
 if(idle)return;idle=true;controls.enabled=true;renderer.domElement.style.cursor='grab';
 panel.classList.remove('visible');textEl.classList.remove('slide-in','slide-out');
 if(mixer){mixer.stopAllAction();currentAnimLooping=false;}
}

// ====== 点击 ======
let cc=0,ct=null;
renderer.domElement.addEventListener('click',()=>{
 cc++;if(ct)clearTimeout(ct);ct=setTimeout(()=>{cc=0;},1200);
 if(cc>=5){cc=0;window.location.href='/admin/';return;}
 idle?enterViewing():exitViewing();
});

// ====== 滚轮 ======
renderer.domElement.addEventListener('wheel',(e)=>{
 if(idle)return;e.preventDefault();if(isTransitioning)return;
 const dir=e.deltaY>0?1:-1,next=(currentViewIndex+dir+CAMERA_PRESETS.length)%CAMERA_PRESETS.length;
 switchToView(next);
 setContentWithSlide(experiencesData[next%experiencesData.length]||{title:''});
},{passive:false});

// ====== Resize ======
window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});

// ====== 动画循环 ======
const clock=new THREE.Clock();
function animate(){
 const t=clock.getElapsedTime();
 if(modelGroup&&!mixer){modelGroup.position.y=0.6+Math.sin(t*0.5)*0.1;modelGroup.rotation.y=t*0.15;}
 particles.rotation.y=t*0.02;particles.rotation.x=Math.sin(t*0.01)*0.05;
 if(isTransitioning){transitionProgress+=0.025;if(transitionProgress>=1){transitionProgress=1;isTransitioning=false;}
  const p=transitionProgress<0.5?4*transitionProgress*transitionProgress*transitionProgress:1-Math.pow(-2*transitionProgress+2,3)/2;
  camera.position.lerpVectors(fromPos,toPos,p);lookTarget.lerpVectors(fromTarget,toTarget,p);}
 // 循环动画持续更新
 if(mixer&&currentAnimLooping){mixer.update(clock.getDelta());}
 else if(mixer){mixer.update(0);}
 camera.lookAt(lookTarget);controls.update();renderer.render(scene,camera);requestAnimationFrame(animate);
}
animate();
