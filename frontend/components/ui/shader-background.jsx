'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Valentine's Day Red/Pink CPPN Shader
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Simplified animated Valentine's gradient shader
const fragmentShader = `
  #ifdef GL_ES
    precision mediump float;
  #endif
  uniform float iTime;
  uniform vec2 iResolution;
  varying vec2 vUv;
  
  // Simplex noise function for organic animation
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  void main() {
    vec2 uv = vUv;
    
    // Create flowing noise pattern
    float t = iTime * 0.3;
    float noise1 = snoise(uv * 2.0 + vec2(t * 0.5, t * 0.3)) * 0.5 + 0.5;
    float noise2 = snoise(uv * 3.0 - vec2(t * 0.4, t * 0.6)) * 0.5 + 0.5;
    float noise3 = snoise(uv * 1.5 + vec2(t * 0.2, -t * 0.4)) * 0.5 + 0.5;
    
    // Combine noises
    float combined = (noise1 + noise2 * 0.5 + noise3 * 0.25) / 1.75;
    
    // Valentine's Day color palette
    vec3 darkRed = vec3(0.15, 0.02, 0.05);    // Deep dark red
    vec3 midRed = vec3(0.4, 0.05, 0.1);       // Medium red
    vec3 brightPink = vec3(0.6, 0.1, 0.2);    // Bright pink
    vec3 softPink = vec3(0.5, 0.15, 0.25);    // Soft pink
    
    // Create gradient based on position and noise
    vec3 color;
    float gradientY = uv.y;
    float gradientX = uv.x * 0.3;
    
    // Mix colors based on position and animated noise
    if (combined < 0.4) {
      color = mix(darkRed, midRed, combined / 0.4);
    } else if (combined < 0.7) {
      color = mix(midRed, softPink, (combined - 0.4) / 0.3);
    } else {
      color = mix(softPink, brightPink, (combined - 0.7) / 0.3);
    }
    
    // Add position-based gradient
    color = mix(color, darkRed, gradientY * 0.4);
    color = mix(color, darkRed, (1.0 - gradientX) * 0.2);
    
    // Add subtle pulsing glow
    float pulse = sin(iTime * 0.5) * 0.5 + 0.5;
    color += vec3(0.05, 0.01, 0.02) * pulse * noise1;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

const CPPNShaderMaterial = shaderMaterial(
  { iTime: 0, iResolution: new THREE.Vector2(1, 1) },
  vertexShader,
  fragmentShader
);

extend({ CPPNShaderMaterial });

function ShaderPlane() {
  const meshRef = useRef(null);
  const materialRef = useRef(null);

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.iTime = state.clock.elapsedTime;
    const { width, height } = state.size;
    materialRef.current.iResolution.set(width, height);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[3, 3]} />
      <cPPNShaderMaterial ref={materialRef} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function ShaderBackground() {
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const camera = useMemo(() => ({ 
    position: [0, 0, 1], 
    fov: 75, 
    near: 0.1, 
    far: 1000 
  }), []);
  
  useEffect(() => {
    // Trigger fade-in animation after mount
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div 
      ref={canvasRef} 
      className={`bg-black fixed top-0 left-0 w-screen h-screen transition-all duration-1000 ease-out ${
        isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-70 scale-110 blur-lg'
      }`}
      style={{ 
        margin: 0,
        padding: 0,
        zIndex: 0,
      }}
      aria-hidden
    >
      <Canvas
        camera={camera}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        className="w-full h-full block"
      >
        <ShaderPlane />
      </Canvas>
      {/* Gradient overlays for depth and readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
    </div>
  );
}
