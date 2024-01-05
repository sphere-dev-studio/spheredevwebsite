import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { gsap } from 'gsap';

const canvas = document.querySelector('canvas.webgl')

// Initialisation de Three.js
const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Création de la sphère
const geometry = new THREE.IcosahedronGeometry(10, 64);


const uniforms = {
  uTime: { value: 0.0 },
  uSpeed: { value: 0.1 },
  uNoiseDensity: { value: 0.6 },
  uNoiseStrength: { value: 0.17 },
  uFrequency: { value: 3 },
  uAmplitude: { value: 6 },
  uHue: { value: 0.5 },
  color1: { value: new THREE.Color(0x181338) },
  color2: { value: new THREE.Color(0xe45500) },
  color3: { value: new THREE.Color(0xeb4217) },
  uAlpha: { value: 1.0 },
  defines: {
    PI: Math.PI
  },

};



// Vertex Shader
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying float vDistort;

  uniform float uTime;
  uniform float uSpeed;
  uniform float uNoiseDensity;
  uniform float uNoiseStrength;
  uniform float uFrequency;
  uniform float uAmplitude;
  uniform float uOffset;

vec3 mod289(vec3 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

float pnoise(vec3 P, vec3 rep)
{
  vec3 Pi0 = mod(floor(P), rep);
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); 
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

  mat3 rotation3dY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
  }

  vec3 rotateY(vec3 v, float angle) { return rotation3dY(angle) * v; }


float map(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

void main() {
  vUv = uv;
  
  float t = uTime * uSpeed;
  float distortion = pnoise((normal + t) * uNoiseDensity, vec3(10.0)) * uNoiseStrength;

  vec3 pos = position + (normal * distortion);
  float angle = sin(uv.y * uFrequency + t) * uAmplitude;
  pos = rotateY(pos, angle);

  pos *= map(sin(uTime + uOffset), -1.0, 1.0, 1.0, 1.2);

  vDistort = distortion;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
}
`;

const fragmentShader = `
varying vec2 vUv;
varying float vDistort;

uniform float uTime;
uniform float uHue;
uniform float uAlpha;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;

vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}   

void main() {
  float distort = vDistort * 2.0;

  vec3 brightness = vec3(0.5, 0.5, 0.9);
  vec3 contrast = vec3(1, 1, 1);
  vec3 oscilation = vec3(1, 1, 1);
  vec3 phase = vec3(0.0, 0.1, 0.2);

  vec3 color = cosPalette(uHue + distort, brightness, contrast, oscilation, phase);

  gl_FragColor = vec4(color, uAlpha);
}
`;

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  // Update camera
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Application des Shaders
const material = new THREE.ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  uniforms: uniforms,
});


const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

//film pass (un peu de grain)
const filmPass = new FilmPass(
  0.15,   // noise intensity
  0.025,  // scanline intensity
  648,    // scanline count
  false,  // grayscale
);

composer.addPass(filmPass);


// Lumière

const directionalLight = new THREE.DirectionalLight('#ffffff', 3)
const ambientLight = new THREE.AmbientLight('#ffffff', 1)
directionalLight.position.set(10, 10, 10)
scene.add(ambientLight)
scene.add(directionalLight)

const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);


// Position de la caméra
camera.position.z = 1000;

// Cible pour la position z de la caméra
const targetZ = 30;


// Variable pour suivre si l'animation est complète
let isCameraAnimationComplete = false;

function animateCameraPosition() {
  if (!isCameraAnimationComplete) {
    gsap.to(camera.position, {
      z: targetZ,
      duration: 2,
      ease: "power2.out",
      onUpdate: () => {
      },
      onComplete: () => {
        isCameraAnimationComplete = true;
      }
    });
  }
}

//when the animation is complete, we rotate the sphere and the camera
gsap.to(sphere.rotation, {
  delay: 3,
  duration: 2,
  x: 1.5,
  ease: "power2.inOut"
});

gsap.to(camera.position, {
  delay: 5,
  duration: 2,
  z: 13,
  ease: "power2.inOut"
});


gsap.to(".letter", {
  delay: 1,
  duration: 1.5,
  opacity: 1,
  stagger: 0.1, // Délai entre l'animation de chaque lettre
  ease: "power2.inOut", // Type d'effet d'ease
  onComplete: () => {
    fadeOutLetters();
    fadeOutImage();
  }
});

function fadeOutLetters() {
  gsap.to(".letter", {
    duration: 0.5,
    opacity: 0,
    stagger: 0.1,
    delay: 0.5,
    ease: "power2.inOut"
  });
}

//animation pour logo
gsap.to("#myImage", {
  delay: 1.5, // Ou après l'animation du texte
  duration: 1.5,
  opacity: 1,
  ease: "power2.inOut",
  onComplete: fadeOutImage
});


function fadeOutImage() {
  gsap.to("#myImage", {
    duration: 0.5,
    opacity: 0,
    stagger: 0.1,
    delay: 1,
    ease: "power2.inOut",
  });
}

// Fonction de rendu
function animate() {
  requestAnimationFrame(animate);

  //utime
  uniforms.uTime.value += 0.01;

  // Animer la position de la caméra
  animateCameraPosition();

  // renderer.render(scene, camera);
  composer.render();

}

animate();
