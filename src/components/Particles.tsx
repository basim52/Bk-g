/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';
import { computeCurl } from '../utils/curlNoise';

const MAX_PARTICLES = 25000;
const PARTICLE_LIFETIME = 3.0; // seconds

interface Particle {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  baseColor: THREE.Color;
  life: number;
  isMine: boolean;
}

export function Particles({ mousePosRef }: { mousePosRef: React.MutableRefObject<THREE.Vector3 | null> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Initialize instanceColor
  React.useEffect(() => {
    if (meshRef.current) {
      const color = new THREE.Color();
      for (let i = 0; i < MAX_PARTICLES; i++) {
        meshRef.current.setColorAt(i, color);
      }
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, []);

  const myId = useGameStore((state) => state.myId);
  const myColor = useGameStore((state) => state.myColor);
  const players = useGameStore((state) => state.players);
  const forceFields = useGameStore((state) => state.forceFields);
  const orbs = useGameStore((state) => state.orbs);
  const chargeOrb = useGameStore((state) => state.chargeOrb);
  const currentAnomaly = useGameStore((state) => state.currentAnomaly);

  // Detect self surge level for particle count spawning bonus
  const selfPlayer = useMemo(() => {
    if (!myId) return null;
    return Object.values(players).find(p => p.id === myId) || null;
  }, [players, myId]);

  const surgeLevel = selfPlayer?.upgrades?.surge || 1;

  // Local charge accumulation buffer to throttle WS traffic
  const chargeAccumulatorRef = useRef<Record<string, number>>({});
  const lastReportTimeRef = useRef(0);

  const particles = useMemo(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      arr.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        baseColor: new THREE.Color(),
        life: 0,
        isMine: false,
      });
    }
    return arr;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const spawnIndex = useRef(0);

  const getTrailColor = (colorHex: string, activeTrail?: string) => {
    if (activeTrail === 'solar') return '#ff5a00';
    if (activeTrail === 'cyber') return '#00eeff';
    if (activeTrail === 'quantum') return '#00ff51';
    return colorHex;
  };

  const spawnParticle = (pos: THREE.Vector3, colorHex: string, isMine: boolean) => {
    const p = particles[spawnIndex.current];
    p.active = true;
    p.isMine = isMine;
    p.position.copy(pos);
    
    // Spread based on gravity/force strength or upgrade status
    const spread = isMine ? 1.0 : 1.3;
    p.position.x += (Math.random() - 0.5) * spread;
    p.position.y += (Math.random() - 0.5) * spread;
    p.position.z += (Math.random() - 0.5) * spread;
    
    p.velocity.set(
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.2
    );
    p.color.set(colorHex);
    p.baseColor.set(colorHex);
    p.life = PARTICLE_LIFETIME;

    spawnIndex.current = (spawnIndex.current + 1) % MAX_PARTICLES;
  };

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const isHyperdrift = currentAnomaly?.type === 'hyperdrift';

    // Spawn my particles (upgrade levels increase particle emissions!)
    if (mousePosRef.current && myColor) {
      const trailColor = getTrailColor(myColor, selfPlayer?.activeTrail);
      const spawnCount = (40 + surgeLevel * 30) * (isHyperdrift ? 1.4 : 1.0); // 70 to 190 particles per frame!
      for (let i = 0; i < spawnCount; i++) {
        spawnParticle(mousePosRef.current, trailColor, true);
      }
    }

    // Spawn other players' and bots' particles
    Object.values(players).forEach(player => {
      if (player.position && player.color) {
        const pPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
        const trailColor = getTrailColor(player.color, player.activeTrail);
        // Bots or other users spawn normal density particles
        const outerSurge = player.upgrades?.surge || 1;
        const count = (30 + outerSurge * 15) * (isHyperdrift ? 1.4 : 1.0);
        for (let i = 0; i < count; i++) {
          spawnParticle(pPos, trailColor, player.id === myId);
        }
      }
    });

    const activeForces = Object.values(forceFields);
    const activeOrbs = Object.values(orbs);
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    const emberColor = new THREE.Color('#ff3300');
    const whiteColor = new THREE.Color('#ffffff');

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      if (!p.active) {
        dummy.position.set(0, 0, 0);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        continue;
      }

      p.life -= delta;
      if (p.life <= 0) {
        p.active = false;
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        continue;
      }

      // Apply curl noise: Boost noise during Hyperdrive!
      const curl = computeCurl(p.position.x * 0.3, p.position.y * 0.3, p.position.z * 0.3);
      const curlScalar = currentAnomaly?.type === 'hyperdrift' ? 12.0 : 5.0;
      p.velocity.add(curl.multiplyScalar(delta * curlScalar));

      // Apply force fields
      for (const force of activeForces) {
        const fPos = new THREE.Vector3(force.position.x, force.position.y, force.position.z);
        const dir = new THREE.Vector3().subVectors(fPos, p.position);
        const distSq = dir.lengthSq();
        
        if (distSq > 0.1 && distSq < 450) {
          dir.normalize();
          
          // Force scale rises with player gravity upgrades!
          const ownerUpgrade = players[force.ownerId]?.upgrades?.gravity || 1;
          const gravityMult = 1.0 + (ownerUpgrade - 1) * 0.4; // up to 2.6x gravity!
          // Collapse anomaly multiplier
          const collapseMult = currentAnomaly?.type === 'collapse' ? 2.2 : 1.0;
          const strength = (100.0 * gravityMult * collapseMult) / distSq;

          if (force.type === 'attractor') {
            p.velocity.add(dir.multiplyScalar(strength * delta));
            if (distSq < 15) {
               p.baseColor.lerp(whiteColor, 0.04); // tint of attraction
            }
          } else {
            p.velocity.sub(dir.multiplyScalar(strength * delta));
          }
        }
      }

      // Vacuum assist around cursor (increases with upgrade!)
      if (p.isMine && mousePosRef.current) {
        const vacuumLevel = selfPlayer?.upgrades?.vacuum || 1;
        const isHyper = currentAnomaly?.type === 'hyperdrift';
        const suctionRadius = (1.5 + vacuumLevel * 1.2) * (isHyper ? 1.5 : 1.0); // 2.7 to 7.5 units of cursor vacuum!
        const vacuumForce = (1.0 + vacuumLevel * 0.5) * (isHyper ? 1.6 : 1.0);

        const distanceToCursor = p.position.distanceTo(mousePosRef.current);
        if (distanceToCursor < suctionRadius && distanceToCursor > 0.1) {
          const toCursor = new THREE.Vector3().subVectors(mousePosRef.current, p.position).normalize();
          p.velocity.add(toCursor.multiplyScalar(vacuumForce * 8.0 * delta));
        }
      }

      // Damping: Damping is lower in Hyper-drift, causing long galactic trails
      const dampingFactor = currentAnomaly?.type === 'hyperdrift' ? 0.978 : 0.96;
      p.velocity.multiplyScalar(dampingFactor);
      p.position.addScaledVector(p.velocity, delta);

      // Collision Check with Active Cosmic Orbs (only process for particles owned by me)
      if (p.isMine && activeOrbs.length > 0) {
        for (const orb of activeOrbs) {
          const oPos = new THREE.Vector3(orb.position.x, orb.position.y, orb.position.z);
          const distSq = p.position.distanceToSquared(oPos);
          
          // Hitbox depends on Orb tier!
          const hitRadius = orb.type === 'supernova' ? 2.3 : orb.type === 'nebula' ? 1.6 : 1.1;
          if (distSq < hitRadius * hitRadius) {
            // Particle gets absorbed visually!
            p.active = false;
            p.life = 0;
            
            // Accumulate charge locally
            const chargePower = 1.0 + (selfPlayer?.upgrades?.vacuum || 1) * 0.25; // upgrade boosts charge power!
            // Double charging speed during eclipse!
            const eclipseMultiplier = currentAnomaly?.type === 'eclipse' ? 2 : 1;
            chargeAccumulatorRef.current[orb.id] = (chargeAccumulatorRef.current[orb.id] || 0) + (chargePower * eclipseMultiplier);
            break; // Absorbed! Skip other orb checks.
          }
        }
      }

      // Color shift based on life: eclipse anomalies shift particles to indigo space voids
      const lifeRatio = p.life / PARTICLE_LIFETIME;
      p.color.copy(p.baseColor);
      const isEclipse = currentAnomaly?.type === 'eclipse';
      const targetLerpColor = isEclipse ? new THREE.Color('#9333ea') : emberColor;
      p.color.lerp(targetLerpColor, Math.pow(1 - lifeRatio, 2));

      // Update instanced mesh
      dummy.position.copy(p.position);
      
      const speed = p.velocity.length();
      const scale = (p.life / PARTICLE_LIFETIME) * 0.082;
      const maxStretch = currentAnomaly?.type === 'hyperdrift' ? 7.0 : 4.0;
      const stretch = Math.min(maxStretch, Math.max(1, speed * 0.1));
      
      dummy.scale.set(scale, scale, scale * stretch);

      if (speed > 0.01) {
        const dir = p.velocity.clone().normalize();
        quaternion.setFromUnitVectors(up, dir);
        dummy.quaternion.copy(quaternion);
      }

      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, p.color);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }

    // Process reporting of accumulated orb charges to the WebSocket cleanly and throttled
    const stateTime = state.clock.getElapsedTime();
    if (stateTime - lastReportTimeRef.current > 0.12) { // approx 120ms tick rate
      Object.entries(chargeAccumulatorRef.current).forEach(([orbId, totalChg]) => {
        if (totalChg > 0) {
          chargeOrb(orbId, totalChg);
        }
      });
      chargeAccumulatorRef.current = {};
      lastReportTimeRef.current = stateTime;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial 
        map={particleTexture}
        transparent 
        opacity={0.8} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
