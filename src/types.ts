export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Player {
  id: string;
  color: string;
  position: Vector3 | null;
  lastUpdate: number;
  name: string;
  score: number;
  isBot?: boolean;
  upgrades: {
    surge: number;     // Particle rate level (1 to 5)
    gravity: number;   // Force field strength (1 to 5)
    vacuum: number;    // Cursor pull radius level (1 to 5)
  };
  activeTrail?: 'nebula' | 'solar' | 'cyber' | 'quantum';
  activeEmote?: {
    text: string;
    createdAt: number;
  } | null;
}

export interface ForceField {
  id: string;
  position: Vector3;
  type: 'attractor' | 'repulsor';
  ownerId: string;
  createdAt: number;
  color: string;
}

export interface Orb {
  id: string;
  position: Vector3;
  type: 'spark' | 'nebula' | 'supernova';
  targetCharge: number;
  totalCharge: number;
  charge: Record<string, number>; // maps player/bot ID to their accumulative charge
}

export interface Anomaly {
  type: 'none' | 'hyperdrift' | 'eclipse' | 'collapse';
  title: string;
  description: string;
  endsAt: number;
  color: string;
}

export interface HarvestEffect {
  id: string;
  position: Vector3;
  color: string;
  time: number;
}

