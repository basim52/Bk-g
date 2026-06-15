/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';
import { Trail, Html } from '@react-three/drei';
import { Player } from '../types';

function PlayerCursor({ player, position }: { player: Player; position: THREE.Vector3 }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Smoothly interpolate position
      meshRef.current.position.lerp(position, 0.2);
      // Add a fast pulsing effect based on spawn rate
      const scale = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.2;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Trail
      width={0.5}
      length={20}
      color={new THREE.Color(player.color)}
      attenuation={(t) => t * t}
    >
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color={player.color} transparent opacity={0.8} />
        {/* Outer glow */}
        <mesh>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshBasicMaterial color={player.color} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        
        {/* Dynamic Name Tag & Floating Speech Emote */}
        <Html center distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div className="flex flex-col items-center gap-1">
            {player.activeEmote && (
              <div 
                className="bg-[#050510]/95 border px-2.5 py-1.5 rounded-xl text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400 whitespace-nowrap shadow-[0_0_15px_rgba(0,0,0,0.8)] animate-bounce"
                style={{ borderColor: player.color + '40' }}
              >
                💬 {player.activeEmote.text}
              </div>
            )}
            <span 
              className="text-[9px] uppercase font-extrabold tracking-wider whitespace-nowrap bg-black/85 px-2 py-0.5 rounded-md border text-gray-300 shadow-md"
              style={{ borderColor: player.color + '40' }}
            >
              {player.name}
            </span>
          </div>
        </Html>
      </mesh>
    </Trail>
  );
}

export function LocalCursor({ mousePosRef }: { mousePosRef: React.MutableRefObject<THREE.Vector3 | null> }) {
  const myColor = useGameStore((state) => state.myColor);
  const me = useGameStore((state) => state.me);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && mousePosRef.current) {
      meshRef.current.position.lerp(mousePosRef.current, 0.5);
      const scale = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.2;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  if (!myColor || !me) return null;

  return (
    <Trail
      width={0.5}
      length={20}
      color={new THREE.Color(myColor)}
      attenuation={(t) => t * t}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color={myColor} transparent opacity={0.8} />
        <mesh>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshBasicMaterial color={myColor} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>

        {/* Local Name Tag and active local emote */}
        <Html center distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div className="flex flex-col items-center gap-1">
            {me.activeEmote && (
              <div 
                className="bg-[#050510]/95 border px-2.5 py-1.5 rounded-xl text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400 whitespace-nowrap shadow-[0_0_15px_rgba(0,0,0,0.8)] animate-bounce"
                style={{ borderColor: myColor + '40' }}
              >
                💬 {me.activeEmote.text}
              </div>
            )}
            <span 
              className="text-[9px] uppercase font-extrabold tracking-wider whitespace-nowrap bg-indigo-500/15 px-2 py-0.5 rounded-md border text-white shadow-md animate-pulse"
              style={{ borderColor: myColor + '50' }}
            >
              🚀 {me.name}
            </span>
          </div>
        </Html>
      </mesh>
    </Trail>
  );
}

export function OtherPlayers() {
  const players = useGameStore((state) => state.players);

  return (
    <>
      {Object.values(players).map((player) => {
        if (!player.position) return null;
        const pos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
        return <PlayerCursor key={player.id} player={player} position={pos} />;
      })}
    </>
  );
}
