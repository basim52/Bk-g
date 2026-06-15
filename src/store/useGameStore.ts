/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Vector3, Player, ForceField, Orb, Anomaly, HarvestEffect } from '../types';
import { 
  playSpawnSound, 
  playChargeTick, 
  playHarvestSound, 
  playUpgradeSound 
} from '../utils/audio';

interface GameState {
  myId: string | null;
  myColor: string | null;
  myName: string | null;
  me: Player | null;
  players: Record<string, Player>;
  forceFields: Record<string, ForceField>;
  orbs: Record<string, Orb>;
  scores: Record<string, number>;
  harvestEffects: HarvestEffect[];
  notification: { text: string; color: string; id: string } | null;
  currentAnomaly: Anomaly | null;
  ws: WebSocket | null;
  isConnected: boolean;
  
  connect: () => void;
  disconnect: () => void;
  sendCursor: (position: Vector3) => void;
  addForce: (position: Vector3, type: 'attractor' | 'repulsor') => void;
  chargeOrb: (orbId: string, amount: number) => void;
  buyUpgrade: (upgradeId: 'surge' | 'gravity' | 'vacuum') => void;
  changeName: (name: string) => void;
  sendEmote: (text: string) => void;
  selectTrail: (trailId: 'nebula' | 'solar' | 'cyber' | 'quantum') => void;
  addNotification: (text: string, color: string) => void;
  clearNotification: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  myId: null,
  myColor: null,
  myName: null,
  me: null,
  players: {},
  forceFields: {},
  orbs: {},
  scores: {},
  harvestEffects: [],
  notification: null,
  currentAnomaly: null,
  ws: null,
  isConnected: false,

  connect: () => {
    const { ws: currentWs } = get();
    if (currentWs && (currentWs.readyState === WebSocket.CONNECTING || currentWs.readyState === WebSocket.OPEN)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}`);

    ws.onopen = () => {
      set({ isConnected: true });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'init') {
        const playersMap: Record<string, Player> = {};
        data.players.forEach((p: Player) => {
          if (p.id !== data.id) playersMap[p.id] = p;
        });
        
        const forcesMap: Record<string, ForceField> = {};
        data.forceFields.forEach((f: ForceField) => {
          forcesMap[f.id] = f;
        });

        const orbsMap: Record<string, Orb> = {};
        data.orbs.forEach((o: Orb) => {
          orbsMap[o.id] = o;
        });

        const initialScores: Record<string, number> = {};
        data.players.forEach((p: Player) => {
          initialScores[p.id] = p.score;
        });

        const mePlayer = data.players.find((p: Player) => p.id === data.id) || null;
        
        set({ 
          myId: data.id, 
          myColor: data.color, 
          myName: data.name,
          me: mePlayer,
          players: playersMap, 
          forceFields: forcesMap,
          orbs: orbsMap,
          scores: initialScores,
          currentAnomaly: data.currentAnomaly || null
        });
      } 
      else if (data.type === 'player_joined') {
        set((state) => ({
          players: { ...state.players, [data.player.id]: data.player },
          scores: { ...state.scores, [data.player.id]: data.player.score }
        }));
        if (data.player.isBot) {
          // silent bot join
        } else {
          get().addNotification(`✨ ${data.player.name} joined the cosmos!`, data.player.color);
        }
      } 
      else if (data.type === 'player_left') {
        const leftPlayer = get().players[data.id];
        set((state) => {
          const newPlayers = { ...state.players };
          delete newPlayers[data.id];
          const newScores = { ...state.scores };
          delete newScores[data.id];
          return { players: newPlayers, scores: newScores };
        });
        if (leftPlayer) {
          get().addNotification(`🛰️ ${leftPlayer.name} faded away...`, '#888888');
        }
      } 
      else if (data.type === 'player_updated') {
        const updated = data.player as Player;
        if (updated.id === get().myId) {
          const oldMe = get().me;
          const hasUpgraded = oldMe && (
            updated.upgrades.surge > oldMe.upgrades.surge ||
            updated.upgrades.gravity > oldMe.upgrades.gravity ||
            updated.upgrades.vacuum > oldMe.upgrades.vacuum
          );
          
          set({ 
            myName: updated.name,
            me: updated,
            scores: { ...get().scores, [updated.id]: updated.score }
          });

          if (hasUpgraded) {
            playUpgradeSound();
          }
        } else {
          set((state) => ({
            players: { ...state.players, [updated.id]: updated }
          }));
        }
      }
      else if (data.type === 'sync') {
        set((state) => {
          const newPlayers = { ...state.players };
          data.players.forEach((p: Player) => {
            if (p.id !== state.myId) {
              newPlayers[p.id] = p;
            }
          });
          
          let newForces = state.forceFields;
          if (data.forceFields) {
            newForces = {};
            data.forceFields.forEach((f: ForceField) => {
              newForces[f.id] = f;
            });
          }

          const newOrbs: Record<string, Orb> = {};
          data.orbs.forEach((o: Orb) => {
            newOrbs[o.id] = o;
          });
          
          const newScores = { ...state.scores };
          data.players.forEach((p: Player) => {
            newScores[p.id] = p.score;
          });
          
          let myPlayer = state.me;
          if (state.myId) {
            const foundMyPlayer = data.players.find((p: Player) => p.id === state.myId);
            if (foundMyPlayer) {
              newScores[state.myId] = foundMyPlayer.score;
              myPlayer = foundMyPlayer;
            }
          }
          
          return { 
            players: newPlayers, 
            forceFields: newForces,
            orbs: newOrbs,
            scores: newScores,
            me: myPlayer,
            currentAnomaly: data.currentAnomaly !== undefined ? data.currentAnomaly : state.currentAnomaly
          };
        });
      } 
      else if (data.type === 'anomaly_changed') {
        const anomaly = data.anomaly;
        set({ currentAnomaly: anomaly });
        if (anomaly && anomaly.type !== 'none') {
          get().addNotification(`🌌 ALERT: ${anomaly.title}! ${anomaly.description}`, anomaly.color);
        } else {
          get().addNotification(`🛰️ Cosmos stabilized. Standard gravity and rates recovered.`, '#38bdf8');
        }
      } 
      else if (data.type === 'force_added') {
        set((state) => ({
          forceFields: { ...state.forceFields, [data.force.id]: data.force }
        }));
      }
      else if (data.type === 'sync_scores') {
        set({ scores: data.scores });
      }
      else if (data.type === 'orb_spawned') {
        set((state) => ({
          orbs: { ...state.orbs, [data.orb.id]: data.orb }
        }));
        playSpawnSound();
      }
      else if (data.type === 'orb_harvested') {
        const isMeWinner = data.winnerId === get().myId;
        
        // Remove Orb
        set((state) => {
          const newOrbs = { ...state.orbs };
          delete newOrbs[data.orbId];
          
          // Trigger visual explosion overlay
          const newEffect: HarvestEffect = {
            id: uuidv4(),
            position: data.position,
            color: data.winnerColor,
            time: Date.now()
          };
          
          return { 
            orbs: newOrbs, 
            scores: data.scores,
            harvestEffects: [...state.harvestEffects, newEffect]
          };
        });

        playHarvestSound();
        
        // Add prominent gameplay banner alert!
        if (isMeWinner) {
          get().addNotification(`👑 YOU harvested Cosmic Orb for bonus points!`, get().myColor || '#ffffff');
        } else {
          get().addNotification(`⚡ ${data.winnerName} harvested an Orb!`, data.winnerColor);
        }

        // Clean up visual effect after 2.5 seconds
        setTimeout(() => {
          set((state) => ({
            harvestEffects: state.harvestEffects.filter(e => e.time > Date.now() - 3000)
          }));
        }, 2500);
      }
    };

    ws.onclose = () => {
      set({ isConnected: false });
      const { ws: currentWs } = get();
      if (currentWs === ws) {
        setTimeout(() => get().connect(), 1000);
      }
    };

    set({ ws });
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null, isConnected: false, players: {}, forceFields: {}, orbs: {} });
    }
  },

  sendCursor: (position: Vector3) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'cursor', position }));
    }
  },

  addForce: (position: Vector3, type: 'attractor' | 'repulsor') => {
    const { ws, myColor } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'add_force', position, forceType: type, color: myColor }));
    }
  },

  chargeOrb: (orbId: string, amount: number) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'charge_orb', orbId, amount }));
      // Play brief high pitch rise
      playChargeTick(true);
    }
  },

  buyUpgrade: (upgradeId: 'surge' | 'gravity' | 'vacuum') => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'buy_upgrade', upgradeId }));
    }
  },

  changeName: (name: string) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'change_name', name }));
    }
  },

  sendEmote: (text: string) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'send_emote', text }));
    }
  },

  selectTrail: (trailId: 'nebula' | 'solar' | 'cyber' | 'quantum') => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'select_trail', trailId }));
    }
  },

  addNotification: (text: string, color: string) => {
    const id = uuidv4();
    set({ notification: { text, color, id } });
    
    // Fade out notification after 3.2 seconds
    setTimeout(() => {
      const { notification } = get();
      if (notification && notification.id === id) {
        set({ notification: null });
      }
    }, 3200);
  },

  clearNotification: () => set({ notification: null })
}));
export type { GameState };
