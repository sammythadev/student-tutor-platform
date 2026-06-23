'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function AetherBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const particlesRef = useRef<THREE.Points | null>(null)
  const timeRef = useRef(0)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x09090B)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.z = 100
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(DPR)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x09090B, 1)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Create particles
    const particleCount = 500
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200
      positions[i + 1] = (Math.random() - 0.5) * 200
      positions[i + 2] = (Math.random() - 0.5) * 200
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    // Material with custom shader
    const material = new THREE.PointsMaterial({
      color: 0x4B4BA0,
      size: 2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)
    particlesRef.current = particles

    // Lighting for subtle depth
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0x4B4BA0, 0.5)
    pointLight.position.set(100, 100, 100)
    scene.add(pointLight)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      timeRef.current += 0.001

      if (particlesRef.current) {
        particlesRef.current.rotation.x += 0.00005
        particlesRef.current.rotation.y += 0.00008

        // Breathing pulse effect
        const scale = 1 + Math.sin(timeRef.current * 0.5) * 0.05
        particlesRef.current.scale.set(scale, scale, scale)
      }

      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    // Pointer interaction
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -(e.clientY / window.innerHeight) * 2 + 1

      if (cameraRef.current) {
        cameraRef.current.position.x += (x * 10 - cameraRef.current.position.x) * 0.02
        cameraRef.current.position.y += (y * 10 - cameraRef.current.position.y) * 0.02
        cameraRef.current.lookAt(0, 0, 0)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      containerRef.current?.removeChild(renderer.domElement)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  )
}
