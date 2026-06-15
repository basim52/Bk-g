/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';
import { Orb, HarvestEffect } from '../types';

interface SingleOrbProps {
  orb: Orb;
}

function SingleOrb({ orb }: SingleOrbProps) {
  const outerMeshRef = useRef<THREE.Mesh>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const players = useGameStore((state) => state.players);
  const myId = useGameStore((state) => state.myId);
  const myColor = useGameStore((state) => state.myColor);

  // Determine dominant player & color to tint the core
  const dominantColor = useMemo(() => {
    let maxChg = 0;
    let maxPlayerId = '';
    
    Object.entries(orb.charge).forEach(([pId, val]) => {
      if (val > maxChg) {
        maxChg = val;
        maxPlayerId = pId;
      }
    });

    if (maxChg === 0) return '#718096'; // neutral slate grey

    if (maxPlayerId === myId) return myColor || '#ffffff';
    
    const otherP = players[maxPlayerId];
    return otherP ? otherP.color : '#718096';
  }, [orb.charge, players, myId, myColor]);

  const chargeRatio = Math.min(1.0, orb.totalCharge / orb.targetCharge);

  // Different geometry characteristics based on orb tier
  const tierConfig = useMemo(() => {
    switch (orb.type) {
      case 'supernova':
        return { size: 1.8, rotationSpeed: 1.5, coreColor: '#ff0055' };
      case 'nebula':
        return { size: 1.2, rotationSpeed: 1.0, coreColor: '#33ffaa' };
      case 'spark':
      default:
        return { size: 0.8, rotationSpeed: 0.5, coreColor: '#a855f7' };
    }
  }, [orb.type]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;

    // Pulse the outer protective shell
    if (outerMeshRef.current) {
      outerMeshRef.current.rotation.y = elapsed * 0.4 * tierConfig.rotationSpeed;
      outerMeshRef.current.rotation.x = elapsed * 0.2 * tierConfig.rotationSpeed;
      
      const pulse = 1.0 + Math.sin(elapsed * 4.0) * 0.05;
      outerMeshRef.current.scale.set(
        tierConfig.size * pulse,
        tierConfig.size * pulse,
        tierConfig.size * pulse
      );
    }

    // Growing inner core represents the total absorption progress!
    if (coreMeshRef.current) {
      coreMeshRef.current.rotation.y = -elapsed * 0.5;
      
      // Grow from size 0.1 to 90% of outer shell based on absorption percentage
      const baseCoreSize = 0.2 + chargeRatio * (tierConfig.size * 0.7);
      const innerPulse = baseCoreSize * (1.0 + Math.sin(elapsed * 8.0) * 0.04);
      coreMeshRef.current.scale.set(innerPulse, innerPulse, innerPulse);
    }

    // Spin local orbit progress descriptor rings
    if (ringRef.current) {
      ringRef.current.rotation.z = elapsed * 1.0;
      const ringPulse = (tierConfig.size + 0.3) * (1.0 + Math.sin(elapsed * 2.0) * 0.02);
      ringRef.current.scale.set(ringPulse, ringPulse, 1);
    }
  });

  const posVec = new THREE.Vector3(orb.position.x, orb.position.y, orb.position.z);

  return (
    <group position={posVec}>
      {/* Outer crystalline shell */}
      <mesh ref={outerMeshRef}>
        <icosahedronGeometry args={[1, 2]} />
        <meshPhysicalMaterial
          transmission={0.9}
          thickness={1.5}
          roughness={0.15}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          ior={1.6}
          color={dominantColor}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Pulsing, growing energy core representing absorption percentage */}
      <mesh ref={coreMeshRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={dominantColor}
          toneMapped={false}
        />
      </mesh>

      {/* Orbit ring representing completion boundary */}
      <mesh ref={ringRef} rotation={[90, 0, 0]}>
        <ringGeometry args={[0.95, 1.0, 32]} />
        <meshBasicMaterial
          color={dominantColor}
          transparent
          opacity={0.3 + chargeRatio * 0.6}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Tiny ambient core glow */}
      <pointLight 
        color={dominantColor} 
        intensity={1.5 + chargeRatio * 3} 
        distance={10} 
        decay={2}
      />
    </group>
  );
}

// 3D shockwave component when an orb pops
function PopShockwave({ effect }: { effect: HarvestEffect }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const mountedAt = useRef(Date.now());

  useFrame(() => {
    if (ringRef.current) {
      const elapsed = (Date.now() - effect.time) / 1000;
      const progress = Math.min(1.0, elapsed / 1.5); // 1.5s lifecycle
      
      // Expand from scale 1 to 15
      const scale = 1.0 + progress * 14.0;
      ringRef.current.scale.set(scale, scale, 1);
      
      // Fade out
      if (ringRef.current.material) {
        (ringRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1.0 - progress);
      }
    }
  });

  const posVec = new THREE.Vector3(effect.position.x, effect.position.y, effect.position.z);

  return (
    <mesh ref={ringRef} position={posVec}>
      <ringGeometry args={[0.8, 1.0, 64]} />
      <meshBasicMaterial 
        color={effect.color} 
        transparent 
        opacity={1} 
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

export function CosmicOrbs() {
  const orbs = useGameStore((state) => state.orbs);
  const harvestEffects = useGameStore((state) => state.harvestEffects);

  return (
    <>
      {/* Draw active target orbs */}
      {Object.values(orbs).map((orb) => (
        <SingleOrb key={orb.id} orb={orb} />
      ))}

      {/* Draw collection pop shockwaves */}
      {harvestEffects.map((effect) => (
        <PopShockwave key={effect.id} effect={effect} />
      ))}
    </>
  );
}
