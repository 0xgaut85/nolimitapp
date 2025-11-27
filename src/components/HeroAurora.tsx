"use client"

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type { ShaderMaterial } from "three";

/**
 * Aurora Flow Background - Exact copy from main site (HeroInfinity.tsx)
 */

const BRAND = {
  white: "#ffffff",
  light: "#b3ceb0",
  mid: "#c9ddc6",
  deep: "#98b894",
};

const AuroraMaterial = () => {
  const matRef = useRef<ShaderMaterial>(null);

  const toRGB = (hex: string) => {
    const c = new THREE.Color(hex);
    return new THREE.Vector3(c.r, c.g, c.b);
  };

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_res: { value: new THREE.Vector2(1, 1) },
      u_mouse: { value: new THREE.Vector2(0, 0) },
      u_white: { value: toRGB(BRAND.white) },
      u_light: { value: toRGB(BRAND.light) },
      u_mid: { value: toRGB(BRAND.mid) },
      u_deep: { value: toRGB(BRAND.deep) },
    }),
    []
  );

  const vertex = `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `;

  const fragment = `
    precision highp float;
    varying vec2 vUv;
    uniform float u_time; 
    uniform vec2 u_res; 
    uniform vec2 u_mouse; 
    uniform vec3 u_white; uniform vec3 u_light; uniform vec3 u_mid; uniform vec3 u_deep;

    vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
    vec2 mod289(vec2 x){return x - floor(x * (1.0/289.0)) * 289.0;}
    vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);} 
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187,
                          0.366025403784439,
                         -0.577350269189626,
                          0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ; m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;  
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x * x0.x + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main(){
      vec2 uv = vUv;
      uv -= 0.5;
      uv.x *= u_res.x / u_res.y;

      float t = u_time * 0.12;
      vec2 m = (u_mouse - 0.5) * 0.8;

      float n1 = snoise(uv * 1.2 + vec2(t, -t));
      float n2 = snoise(uv * 2.2 + vec2(-t*0.8, t*0.6));
      float n3 = snoise(uv * 4.0 + m + vec2(t*0.4));
      float band = smoothstep(-0.3, 0.6, n1*0.6 + n2*0.35) + n3*0.08;

      vec3 col = u_white;
      col = mix(col, u_mid, smoothstep(0.3, 0.5, band) * 0.6);
      col = mix(col, u_light, smoothstep(0.5, 0.7, band) * 0.7);
      col = mix(col, u_deep, smoothstep(0.7, 0.9, band) * 0.5);

      float r = length(uv*0.95);
      col = mix(col, u_white, smoothstep(0.8, 1.25, r) * 0.3);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const speed = prefersReduced ? 0.2 : 1.0;
    uniforms.u_time.value = t * speed;
    const { size, pointer } = state;
    uniforms.u_res.value.set(size.width, size.height);
    uniforms.u_mouse.value.set(pointer.x * 0.5 + 0.5, pointer.y * 0.5 + 0.5);
  });

  return (
    <shaderMaterial ref={matRef} uniforms={uniforms} vertexShader={vertex} fragmentShader={fragment} transparent={false} />
  );
};

function AuroraPlane(){
  return (
    <mesh position={[0,0,0]}>
      <planeGeometry args={[12, 7, 1, 1]} />
      <AuroraMaterial />
    </mesh>
  );
}

function Dust(){
  const ref = useRef<THREE.Points>(null!);
  const { positions } = useMemo(() => {
    const count = 1800;
    const positions = new Float32Array(count * 3);
    for(let i=0;i<count;i++){
      const x = (Math.random()-0.5) * 10;
      const y = (Math.random()-0.5) * 6;
      const z = -0.5 - Math.random()*2.5;
      positions.set([x,y,z], i*3);
    }
    return { positions };
  }, []);

  useFrame((state)=>{
    if(!ref.current) return;
    const t = state.clock.getElapsedTime()*0.02;
    ref.current.rotation.z = t;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length/3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.012} opacity={0.25} transparent depthWrite={false} color={BRAND.light} />
    </points>
  );
}

function Scene(){
  useFrame((state)=>{
    const p = state.pointer;
    const target = new THREE.Vector3(p.x*0.15, p.y*0.08, 6);
    state.camera.position.lerp(target, 0.05);
    state.camera.lookAt(0,0,0);
  });
  return (
    <>
      <ambientLight intensity={0.7} />
      <AuroraPlane />
      <Dust />
      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.6} luminanceSmoothing={0.3} radius={0.7} />
      </EffectComposer>
    </>
  );
}

export default function HeroAurora(){
  return (
    <Canvas dpr={[1,2]} camera={{ position:[0,0,6], fov: 42 }} style={{ width: '100%', height: '100%' }}>
      <Scene />
    </Canvas>
  );
}
