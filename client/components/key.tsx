"use client"

import { useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { Text } from "@react-three/drei"
import * as THREE from "three"
import type { KeyData } from "./keyboard-layout"

interface KeyProps {
  data: KeyData
  position: [number, number, number]
  isPressed: boolean
  onPress: () => void
}

export function Key({ data, position, isPressed, onPress }: KeyProps) {
  const meshRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  // Target Y position: 0 is resting, -0.15 is pressed (slightly shallower for realism)
  const targetY = isPressed ? -0.15 : 0

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Smoothly interpolate current Y to target Y
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y,
        targetY,
        0.5, // Snappier response
      )
    }
  })

  const width = data.width || 1
  const depth = 1
  const height = 0.5 // Standard keycap height

  // Color logic
  const baseColor = data.color || "#f4f4f5" // zinc-100
  const activeColor = "#e4e4e7" // zinc-200
  const hoverColor = "#fafafa" // zinc-50

  const materialColor = isPressed ? activeColor : hovered ? hoverColor : baseColor
  const textColor = data.textColor || "#18181b" // zinc-900

  return (
    <group
      ref={meshRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerDown={(e) => {
        e.stopPropagation()
        onPress()
      }}
    >
      {/* Keycap Mesh */}
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        {/* Beveled box for better realism */}
        <boxGeometry args={[width * 0.92, height, depth * 0.92]} />
        <meshStandardMaterial color={materialColor} roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Key Label */}
      <Text
        position={[
          data.align === "left" ? -width / 2 + 0.3 : data.align === "right" ? width / 2 - 0.3 : 0,
          height + 0.01,
          data.align === "left" || data.align === "right" ? 0 : 0.1,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={data.fontSize || 0.25}
        color={textColor}
        font="https://raw.githubusercontent.com/vercel/geist-font/main/fonts/GeistMono/ttf/GeistMono-Bold.ttf"
        anchorX={data.align || "center"}
        anchorY="middle"
      >
        {data.label}
      </Text>
    </group>
  )
}
