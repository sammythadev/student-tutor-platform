'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile = window.innerWidth < 768
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: true,
      powerPreference: 'high-performance',
    })
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(DPR)
    renderer.setSize(window.innerWidth, window.innerHeight)

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.z = 30

    const count = isMobile ? 100 : 300
    const positions = new Float32Array(count * 6)
    const velocities = new Float32Array(count * 3)
    const lifetimes = new Float32Array(count)
    const maxLifetimes = new Float32Array(count)
    const alphas = new Float32Array(count)

    function resetLine(i: number) {
      const angle = (Math.random() - 0.5) * 1.2
      const speed = 0.02 + Math.random() * 0.05
      const len = 0.8 + Math.random() * 1.5
      const baseX = (Math.random() - 0.5) * 40
      const baseY = (Math.random() - 0.5) * 24

      positions[i * 6] = baseX
      positions[i * 6 + 1] = baseY
      positions[i * 6 + 2] = (Math.random() - 0.5) * 6
      positions[i * 6 + 3] = baseX + Math.cos(angle) * len
      positions[i * 6 + 4] = baseY + Math.sin(angle) * len
      positions[i * 6 + 5] = positions[i * 6 + 2] + (Math.random() - 0.5) * 0.3

      velocities[i * 3] = Math.cos(angle) * speed
      velocities[i * 3 + 1] = Math.sin(angle) * speed
      velocities[i * 3 + 2] = 0

      lifetimes[i] = 0
      maxLifetimes[i] = 300 + Math.random() * 400
      alphas[i] = 0.15 + Math.random() * 0.25
    }

    for (let i = 0; i < count; i++) {
      resetLine(i)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#818CF8') },
      },
      vertexShader: `
        attribute float aAlpha;
        uniform float uTime;
        varying float vAlpha;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = 1.0;
          vAlpha = aAlpha;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
          gl_FragColor = vec4(uColor, vAlpha * 0.5);
        }
      `,
      transparent: true,
      depthWrite: false,
    })

    const lines = new THREE.LineSegments(
      geometry,
      material,
    )
    scene.add(lines)

    function onResize() {
      renderer.setSize(window.innerWidth, window.innerHeight)
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const aAlphaAttr = geometry.attributes.aAlpha as THREE.BufferAttribute

    const clock = new THREE.Clock()
    function animate() {
      requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      material.uniforms.uTime.value = t

      const pos = posAttr.array as Float32Array
      const aa = aAlphaAttr.array as Float32Array

      for (let i = 0; i < count; i++) {
        lifetimes[i] += 1

        if (lifetimes[i] >= maxLifetimes[i]) {
          resetLine(i)
          lifetimes[i] = 0
        }

        pos[i * 6] += velocities[i * 3]
        pos[i * 6 + 1] += velocities[i * 3 + 1]
        pos[i * 6 + 2] += velocities[i * 3 + 2]
        pos[i * 6 + 3] += velocities[i * 3]
        pos[i * 6 + 4] += velocities[i * 3 + 1]
        pos[i * 6 + 5] += velocities[i * 3 + 2]
      }

      posAttr.needsUpdate = true
      aAlphaAttr.needsUpdate = true

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  )
}
