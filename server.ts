/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';

const PORT = 3000;

// Game Interfaces inline to maintain simple Node compilation
interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Player {
  id: string;
  color: string;
  position: Vector3 | null;
  lastUpdate: number;
  name: string;
  score: number;
  isBot?: boolean;
  upgrades: {
    surge: number;     // level 1-5 (spawns more particles)
    gravity: number;   // level 1-5 (stronger force fields)
    vacuum: number;    // level 1-5 (larger suction range around cursor)
  };
  activeTrail?: 'nebula' | 'solar' | 'cyber' | 'quantum';
  activeEmote?: {
    text: string;
    createdAt: number;
  } | null;
}

interface ForceField {
  id: string;
  position: Vector3;
  type: 'attractor' | 'repulsor';
  ownerId: string;
  createdAt: number;
  color: string;
}

interface Orb {
  id: string;
  position: Vector3;
  type: 'spark' | 'nebula' | 'supernova';
  targetCharge: number;
  totalCharge: number;
  charge: Record<string, number>; // playerId -> accumulated charge
}

interface Anomaly {
  type: 'none' | 'hyperdrift' | 'eclipse' | 'collapse';
  title: string;
  description: string;
  endsAt: number;
  color: string;
}

// State
const players = new Map<string, Player>();
const forceFields = new Map<string, ForceField>();
const clients = new Map<string, WebSocket>();
const orbs = new Map<string, Orb>();

let currentAnomaly: Anomaly = {
  type: 'none',
  title: 'Stable Cosmos',
  description: 'The universe is currently stable. Standard coefficients apply.',
  endsAt: 0,
  color: '#38bdf8'
};

const ANOMALIES: Omit<Anomaly, 'endsAt'>[] = [
  {
    type: 'hyperdrift',
    title: '⌛ Hyper-Drift Wave',
    description: 'A temporal ripple accelerates all particles! Vacuum range and speed are boosted!',
    color: '#a855f7'
  },
  {
    type: 'eclipse',
    title: '🌑 Cosmic Eclipse',
    description: 'Stellar dust reacts twice as strongly! Orb essence and charge intakes are doubled (x2)!',
    color: '#f43f5e'
  },
  {
    type: 'collapse',
    title: '🧲 Gravity Wave Collapse',
    description: 'Repulsors and attractors gain x2 pull power and lasts much longer!',
    color: '#10b981'
  }
];


// Colors for players/bots
const COLORS = [
  '#FF3366', '#33CCFF', '#FF9933', '#33FF99', 
  '#CC33FF', '#FFFF33', '#FF3333', '#3333FF'
];

const BOT_NAMES = [
  '💫 Quantum-Phantom',
  '🌌 Nebula-Spectre',
  '☄️ Comet-Stalker',
  '✨ Astraea-AI',
  '🌀 Vortex-Ghost',
  '⚡ Chronos-Drifter'
];

function broadcast(data: any, excludeId?: string) {
  const message = JSON.stringify(data);
  for (const [id, ws] of clients.entries()) {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

// Orb Spawning logic
function spawnOrb() {
  const id = uuidv4();
  // Spawn in beautiful viewing range (R3F plane with cam position [0, 0, 20])
  const x = (Math.random() - 0.5) * 24; // -12 to +12
  const y = (Math.random() - 0.5) * 14; // -7 to +7
  const z = 0;

  const rand = Math.random();
  let type: 'spark' | 'nebula' | 'supernova' = 'spark';
  let targetCharge = 120; // Default

  if (rand > 0.90) {
    type = 'supernova';
    targetCharge = 500;
  } else if (rand > 0.60) {
    type = 'nebula';
    targetCharge = 250;
  }

  const orb: Orb = {
    id,
    position: { x, y, z },
    type,
    targetCharge,
    totalCharge: 0,
    charge: {}
  };

  orbs.set(id, orb);
  
  // Broadcast the new orb to all players immediately
  broadcast({
    type: 'orb_spawned',
    orb
  });
}

// Bot management
const bots: Player[] = [];

function initializeBots() {
  // Let's create 3 AI bots with unique names and different colors
  for (let i = 0; i < 3; i++) {
    const botId = `bot-${i}-${uuidv4().substring(0, 5)}`;
    const color = COLORS[(i + 4) % COLORS.length];
    const name = BOT_NAMES[i % BOT_NAMES.length];
    
    const bot: Player = {
      id: botId,
      color,
      position: { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10, z: 0 },
      lastUpdate: Date.now(),
      name,
      score: 100, // standard start points
      isBot: true,
      upgrades: {
        surge: 1,
        gravity: 2,
        vacuum: 1
      }
    };
    
    players.set(botId, bot);
    bots.push(bot);
  }
}

// Run bot behaviors
function tickBots() {
  const activeOrbs = Array.from(orbs.values());
  const now = Date.now();

  bots.forEach((bot, bIdx) => {
    // If no active orbs, drift slowly around center
    if (activeOrbs.length === 0) {
      const time = now * 0.001 + bIdx * Math.PI;
      bot.position = {
        x: Math.sin(time) * 4,
        y: Math.cos(time * 0.7) * 3,
        z: 0
      };
      return;
    }

    // Otherwise, bot goes after an orb!
    // Each bot can have an orb preference or just hunt the closest one
    const preferredOrb = activeOrbs[bIdx % activeOrbs.length] || activeOrbs[0];
    const oPos = preferredOrb.position;
    
    if (!bot.position) {
      bot.position = { x: 0, y: 0, z: 0 };
    }

    // Smoothly seek towards preferred Orb with a little bit of beautiful human orbiting/jitter noise
    const dx = oPos.x - bot.position.x;
    const dy = oPos.y - bot.position.y;
    const distance = Math.hypot(dx, dy);

    // Speed dependent on upgrade levels
    const botSpeed = 0.08 + (bot.upgrades.surge * 0.012);

    if (distance > 0.1) {
      // Orbiting noise offsets
      const orbitOffsetTime = now * 0.003 + bIdx;
      const noiseX = Math.sin(orbitOffsetTime) * 1.5;
      const noiseY = Math.cos(orbitOffsetTime * 1.5) * 1.5;

      // Blend target towards orb center
      const targetX = oPos.x + (distance > 3 ? 0 : noiseX);
      const targetY = oPos.y + (distance > 3 ? 0 : noiseY);

      bot.position.x += (targetX - bot.position.x) * botSpeed;
      bot.position.y += (targetY - bot.position.y) * botSpeed;
    }

    // Bot chance to place an attractor inside or very near the orb (for faster suck-ups!)
    if (Math.random() < 0.015 && distance < 4) {
      const isAttractor = Math.random() < 0.75;
      const forceId = uuidv4();
      const radiusOffset = 1.0;
      const fPos = {
        x: bot.position.x + (Math.random() - 0.5) * radiusOffset,
        y: bot.position.y + (Math.random() - 0.5) * radiusOffset,
        z: 0
      };

      const force: ForceField = {
        id: forceId,
        position: fPos,
        type: isAttractor ? 'attractor' : 'repulsor',
        ownerId: bot.id,
        createdAt: now,
        color: bot.color
      };

      forceFields.set(forceId, force);
      
      broadcast({
        type: 'force_added',
        force
      });
    }

    // Bot charges Orb locally from the server if it's very close (since bot has no client app)
    if (distance < 2.5) {
      // Simulating bot absorption - bots charge the orb directly
      const chargePower = 1.2 + (bot.upgrades.vacuum * 0.3) + (bot.upgrades.surge * 0.2);
      chargeOrb(preferredOrb.id, bot.id, chargePower);
    }
  });
}

function chargeOrb(orbId: string, playerId: string, amount: number) {
  const orb = orbs.get(orbId);
  if (!orb) return;

  const player = players.get(playerId);
  if (!player) return;

  // Record charge
  orb.charge[playerId] = (orb.charge[playerId] || 0) + amount;
  orb.totalCharge += amount;

  // Play safe bounds
  if (orb.totalCharge >= orb.targetCharge) {
    // HARVEST TIME! Find dominant harvester or give points proportionally
    let maxCharge = 0;
    let dominantPlayerId = playerId;

    for (const [pId, pChg] of Object.entries(orb.charge)) {
      if (pChg > maxCharge) {
        maxCharge = pChg;
        dominantPlayerId = pId;
      }
    }

    // Compute scores for everyone based on contribution
    const baseOrbValue = orb.type === 'supernova' ? 800 : orb.type === 'nebula' ? 300 : 100;
    const eclipseMultiplier = currentAnomaly.type === 'eclipse' ? 2 : 1;
    const orbValue = baseOrbValue * eclipseMultiplier;
    
    players.forEach((p) => {
      const prpCharge = orb.charge[p.id] || 0;
      if (prpCharge > 0) {
        const contributionRatio = prpCharge / orb.targetCharge;
        // Dominant player gets a big flat bonus!
        let scoreReward = Math.ceil(orbValue * contributionRatio);
        if (p.id === dominantPlayerId) {
          scoreReward += Math.ceil(orbValue * 0.25); // 25% Winner bonus!
        }
        p.score += scoreReward;
      }
    });

    const dominantPlayer = players.get(dominantPlayerId);
    const winnerName = dominantPlayer?.name || 'Someone';
    const winnerColor = dominantPlayer?.color || '#ffffff';

    // Broadcast the glorious harvest event!
    broadcast({
      type: 'orb_harvested',
      orbId: orb.id,
      winnerId: dominantPlayerId,
      winnerName,
      winnerColor,
      scores: Array.from(players.values()).reduce((acc, p) => {
        acc[p.id] = p.score;
        return acc;
      }, {} as Record<string, number>),
      position: orb.position,
      players: Array.from(players.values())
    });

    orbs.delete(orbId);
    
    // Spawn a replacement immediately
    setTimeout(() => {
      if (orbs.size < 4) {
        spawnOrb();
      }
    }, 1500);
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  
  // WebSocket Server
  const wss = new WebSocketServer({ server });

  // Provision initial elements
  initializeBots();
  for (let s = 0; s < 4; s++) {
    spawnOrb();
  }

  wss.on('connection', (ws) => {
    const id = uuidv4();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const guestIndex = Math.floor(Math.random() * 8999) + 1000;
    const name = `Starharvester-${guestIndex}`;
    
    const player: Player = {
      id,
      color,
      position: null,
      lastUpdate: Date.now(),
      name,
      score: 100, // starting Cosmic Essence
      upgrades: {
        surge: 1,
        gravity: 1,
        vacuum: 1
      }
    };
    
    players.set(id, player);
    clients.set(id, ws);

    // Send initial configuration
    ws.send(JSON.stringify({
      type: 'init',
      id,
      color,
      name,
      players: Array.from(players.values()),
      forceFields: Array.from(forceFields.values()),
      orbs: Array.from(orbs.values()),
      currentAnomaly
    }));

    // Announce player arrival
    broadcast({
      type: 'player_joined',
      player
    }, id);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'cursor') {
          const p = players.get(id);
          if (p) {
            p.position = data.position;
            p.lastUpdate = Date.now();
          }
        } 
        else if (data.type === 'change_name') {
          const p = players.get(id);
          if (p && data.name && data.name.trim().length > 0) {
            p.name = data.name.substring(0, 18);
            broadcast({
              type: 'player_updated',
              player: p
            });
          }
        }
        else if (data.type === 'send_emote') {
          const p = players.get(id);
          if (p && data.text) {
            p.activeEmote = {
              text: data.text.substring(0, 45),
              createdAt: Date.now()
            };
            broadcast({
              type: 'player_updated',
              player: p
            });

            // Auto-clear emote after 4.5 seconds
            setTimeout(() => {
              const curP = players.get(id);
              if (curP && curP.activeEmote && curP.activeEmote.createdAt === p.activeEmote?.createdAt) {
                curP.activeEmote = null;
                broadcast({
                  type: 'player_updated',
                  player: curP
                });
              }
            }, 4500);
          }
        }
        else if (data.type === 'select_trail') {
          const p = players.get(id);
          const allowed = ['nebula', 'solar', 'cyber', 'quantum'];
          if (p && allowed.includes(data.trailId)) {
            p.activeTrail = data.trailId;
            broadcast({
              type: 'player_updated',
              player: p
            });
          }
        }
        else if (data.type === 'charge_orb') {
          const amount = data.amount || 1;
          chargeOrb(data.orbId, id, amount);
        }
        else if (data.type === 'buy_upgrade') {
          const upgradeId = data.upgradeId as 'surge' | 'gravity' | 'vacuum';
          const p = players.get(id);
          if (p) {
            const currentLevel = p.upgrades[upgradeId] || 1;
            if (currentLevel < 5) {
              const cost = currentLevel * 150;
              if (p.score >= cost) {
                p.score -= cost;
                p.upgrades[upgradeId] = currentLevel + 1;
                
                // Broadcast update
                broadcast({
                  type: 'player_updated',
                  player: p
                });
                
                // Re-sync client scores
                broadcast({
                  type: 'sync_scores',
                  scores: Array.from(players.values()).reduce((acc, pl) => {
                    acc[pl.id] = pl.score;
                    return acc;
                  }, {} as Record<string, number>)
                });
              }
            }
          }
        }
        else if (data.type === 'add_force') {
          const forceId = uuidv4();
          const force: ForceField = {
            id: forceId,
            position: data.position,
            type: data.forceType,
            ownerId: id,
            createdAt: Date.now(),
            color: data.color
          };
          forceFields.set(forceId, force);
          
          broadcast({
            type: 'force_added',
            force
          });
        }
      } catch (e) {
        console.error('Invalid message', e);
      }
    });

    ws.on('close', () => {
      players.delete(id);
      clients.delete(id);
      
      // Clean player forced points
      for (const [forceId, force] of forceFields.entries()) {
        if (force.ownerId === id) {
          forceFields.delete(forceId);
        }
      }

      broadcast({
        type: 'player_left',
        id
      });
    });
  });

  // Background Anomaly Rotator: Cycles between stable space and random anomalies
  const triggerNextAnomaly = () => {
    const isCurrentlyNone = currentAnomaly.type === 'none';
    
    if (isCurrentlyNone) {
      const template = ANOMALIES[Math.floor(Math.random() * ANOMALIES.length)];
      currentAnomaly = {
        ...template,
        endsAt: Date.now() + 30000 // lasts 30 seconds
      };

      // Broadcast the exciting discovery!
      broadcast({
        type: 'anomaly_changed',
        anomaly: currentAnomaly
      });

      // Have AI players trigger themed reactions
      bots.forEach((bot, idx) => {
        if (Math.random() < 0.7) {
          setTimeout(() => {
            let phrase = 'Sensors picking up cosmic interference...';
            if (currentAnomaly.type === 'hyperdrift') {
              phrase = 'Hyperdrift waves active! My dust output will be massive 🚀';
            } else if (currentAnomaly.type === 'eclipse') {
              phrase = 'Black hole eclipse! Time to double my essence stash 🌑';
            } else if (currentAnomaly.type === 'collapse') {
              phrase = 'Gravity flux incoming! Attractor spikes placed! 🧲';
            }

            bot.activeEmote = { text: phrase, createdAt: Date.now() };
            broadcast({
              type: 'player_updated',
              player: bot
            });

            // auto clear in 4.5 seconds
            setTimeout(() => {
              if (bot.activeEmote && Date.now() - bot.activeEmote.createdAt >= 4500) {
                bot.activeEmote = null;
                broadcast({
                  type: 'player_updated',
                  player: bot
                });
              }
            }, 4500);
          }, Math.random() * 2500 + 400);
        }
      });
    } else {
      currentAnomaly = {
        type: 'none',
        title: 'Stable Cosmos',
        description: 'The universe is currently stable. Standard coefficients apply.',
        endsAt: 0,
        color: '#38bdf8'
      };

      broadcast({
        type: 'anomaly_changed',
        anomaly: currentAnomaly
      });
    }
  };

  // Run the cycle timer: Toggle every 35 seconds
  setInterval(triggerNextAnomaly, 35000);

  // Main Loop Running at 20Hz (50ms ticks)
  setInterval(() => {
    const now = Date.now();
    
    // Clean old fields: Collapse anomaly doubles their active lifespan!
    let forcesChanged = false;
    const maxAge = currentAnomaly.type === 'collapse' ? 21000 : 10500;
    for (const [fid, force] of forceFields.entries()) {
      if (now - force.createdAt > maxAge) {
        forceFields.delete(fid);
        forcesChanged = true;
      }
    }

    // Run AI Bot Movement and Actions
    tickBots();

    // Replenish Orbs if low
    if (orbs.size < 4) {
      spawnOrb();
    }

    const updateData = {
      type: 'sync',
      players: Array.from(players.values()).filter(p => p.position !== null || p.isBot),
      orbs: Array.from(orbs.values()),
      currentAnomaly,
      ...(forcesChanged ? { forceFields: Array.from(forceFields.values()) } : {})
    };

    broadcast(updateData);
  }, 50);

  // Health API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', playersCount: players.size, orbsCount: orbs.size });
  });

  // Serve builds
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
