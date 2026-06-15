/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { CosmicCanvas } from './components/CosmicCanvas';
import { useGameStore } from './store/useGameStore';
import { 
  Users, 
  Flame, 
  Zap, 
  Award, 
  Edit2, 
  Check, 
  Music, 
  HelpCircle, 
  Sparkles, 
  Plus,
  Compass,
  Radio,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { playAmbientDrone, stopAmbientDrone } from './utils/audio';

export default function App() {
  const connect = useGameStore((state) => state.connect);
  const disconnect = useGameStore((state) => state.disconnect);
  const players = useGameStore((state) => state.players);
  const myId = useGameStore((state) => state.myId);
  const myColor = useGameStore((state) => state.myColor);
  const myName = useGameStore((state) => state.myName);
  const me = useGameStore((state) => state.me);
  const scores = useGameStore((state) => state.scores);
  const notification = useGameStore((state) => state.notification);
  const buyUpgrade = useGameStore((state) => state.buyUpgrade);
  const changeName = useGameStore((state) => state.changeName);
  const isConnected = useGameStore((state) => state.isConnected);
  const sendEmote = useGameStore((state) => state.sendEmote);
  const selectTrail = useGameStore((state) => state.selectTrail);
  const currentAnomaly = useGameStore((state) => state.currentAnomaly);

  const [localName, setLocalName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [showRules, setShowRules] = useState(true);

  // Card Panel visibility states for clean screen toggling
  const [showIdentity, setShowIdentity] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showEmotes, setShowEmotes] = useState(true);
  const [showUpgrades, setShowUpgrades] = useState(true);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
      stopAmbientDrone();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    if (myName) {
      setLocalName(myName);
    }
  }, [myName]);

  // Handle spatial sound toggle
  const toggleSound = () => {
    if (isSoundOn) {
      stopAmbientDrone();
      setIsSoundOn(false);
    } else {
      playAmbientDrone();
      setIsSoundOn(true);
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (localName.trim().length > 0) {
      changeName(localName.trim());
      setIsEditingName(false);
    }
  };

  // Compile a comprehensive leaderboard including self and bots
  const leaderboard = useMemo(() => {
    const list = [];
    
    // Add real-time user
    if (myId) {
      list.push({
        id: myId,
        name: myName || 'Unknown Starharvester',
        color: myColor || '#ffffff',
        score: scores[myId] || me?.score || 0,
        isMe: true,
        upgrades: me?.upgrades || { surge: 1, gravity: 1, vacuum: 1 }
      });
    }

    // Add other players & bots
    Object.values(players).forEach(p => {
      list.push({
        id: p.id,
        name: p.name,
        color: p.color,
        score: scores[p.id] || p.score || 0,
        isBot: p.isBot,
        isMe: false,
        upgrades: p.upgrades
      });
    });

    // Sort descending by score
    return list.sort((a, b) => b.score - a.score);
  }, [players, myId, myColor, myName, scores, me]);

  // Calculate self metrics
  const myScore = myId ? (scores[myId] || me?.score || 0) : 0;
  const mySurge = me?.upgrades?.surge || 1;
  const myGravity = me?.upgrades?.gravity || 1;
  const myVacuum = me?.upgrades?.vacuum || 1;

  // Compute upgrade cost
  const surgeCost = mySurge < 5 ? mySurge * 150 : 0;
  const gravityCost = myGravity < 5 ? myGravity * 150 : 0;
  const vacuumCost = myVacuum < 5 ? myVacuum * 150 : 0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020208] text-gray-100 font-sans select-none">
      {/* 3D Cosmic Background Layer */}
      <CosmicCanvas />

      {/* ACTIVE ANOMALY ALERT BANNER */}
      {currentAnomaly && currentAnomaly.type !== 'none' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-col items-center">
          <div 
            className="flex flex-col items-center text-center bg-[#050512]/95 border px-6 py-2 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.95)] min-w-[325px] border-b-4 transition-all duration-300"
            style={{ borderBottomColor: currentAnomaly.color, borderColor: currentAnomaly.color + '40' }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: currentAnomaly.color }} />
              <span className="text-[9px] tracking-widest uppercase font-black text-gray-400">ACTIVE SPACE ANOMALY</span>
            </div>
            <h3 className="text-sm font-black tracking-wider uppercase mt-0.5 text-white">
              {currentAnomaly.title}
            </h3>
            <p className="text-[10px] text-gray-300 mt-1 leading-normal max-w-sm">
              {currentAnomaly.description}
            </p>
            {/* Simple dynamic visualization track */}
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2 relative">
              <div 
                className="h-full rounded-full animate-[pulse_1.5s_infinite]" 
                style={{ 
                  backgroundColor: currentAnomaly.color, 
                  width: '100%',
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Alert Ticker (Notifiers) */}
      {notification && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center">
          <div 
            className="flex items-center gap-3 bg-[#0d0d1e]/90 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] animate-bounce"
            style={{ boxShadow: `0 0 20px ${notification.color}20` }}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: notification.color }} />
            <span className="text-sm font-semibold tracking-wide text-white">{notification.text}</span>
          </div>
        </div>
      )}

      {/* Main HUD Interface Panels - Pointer clicks pass through to Canvas below except on cards */}
      <div className="absolute inset-0 w-full h-full p-6 flex flex-col justify-between pointer-events-none z-10">
        
        {/* TOP ROW: Header & Leaderboard */}
        <div className="flex justify-between items-start w-full">
          
          {/* HEADER & IDENTITY CONFIG (Left side) */}
          {showIdentity ? (
            <div className="relative space-y-4 pointer-events-auto max-w-sm bg-[#090915]/75 border border-white/5 backdrop-blur-md p-5 rounded-2xl shadow-2xl">
              {/* Close Button / إغلاق */}
              <button 
                onClick={() => setShowIdentity(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-all cursor-pointer z-20"
                title="Hide / إخفاء"
              >
                <X size={14} />
              </button>
              <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="animate-pulse flex h-2 w-2 rounded-full bg-cyan-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">MULTIPLE COSMOS ARENA</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400">
                Cosmic Harvest
              </h1>
              <p className="text-[12px] text-gray-400 leading-snug">
                اشحن الكرات الكونية المتجولة بغبار النجوم الخاص بك لحصاد طاقتها الكونية!
              </p>
            </div>

            {/* Profile Nickname setup */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">Space Harvester</span>
                <div className="flex items-center gap-1.5 text-xs text-white">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: myColor || '#fff' }} />
                  <span className="font-semibold text-gray-300">You (أنت)</span>
                </div>
              </div>

              {isEditingName ? (
                <form onSubmit={handleSaveName} className="flex gap-2">
                  <input 
                    type="text" 
                    value={localName} 
                    onChange={(e) => setLocalName(e.target.value)}
                    maxLength={18}
                    className="flex-1 bg-black/50 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    placeholder="Enter nickname..."
                    autoFocus
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 rounded-lg p-1.5 text-white transition-all">
                    <Check size={14} />
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between bg-black/30 rounded-lg px-2.5 py-1.5 border border-white/5">
                  <span className="text-sm font-semibold text-gray-200">{myName || 'Connecting...'}</span>
                  <button onClick={() => setIsEditingName(true)} className="text-gray-400 hover:text-white transition-colors">
                    <Edit2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* General state panel */}
            <div className="flex gap-2 justify-between">
              <button 
                onClick={toggleSound}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  isSoundOn 
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' 
                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Music size={13} />
                <span>{isSoundOn ? '🔊 Audio ON [متفاعل]' : '🔇 Audio OFF [صامت]'}</span>
              </button>

              <button 
                onClick={() => setShowRules(!showRules)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  showRules 
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' 
                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <HelpCircle size={13} />
                <span>{showRules ? 'Hide Rules [إخفاء]' : 'Show Rules [تعليمات]'}</span>
              </button>
            </div>

            {/* COSMETIC DUST TRAILS */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Sparkles size={14} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">Dust Trail Styles (مظهر الغبار)</h3>
                </div>
                <p className="text-[10px] text-gray-400">Choose your premium cosmetic trail color spectrum!</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'nebula', label: 'Classic Purple', color: '#a855f7', desc: 'Nebula violet gas' },
                  { id: 'solar', label: 'Solar Flare', color: '#ff5a00', desc: 'Sizzling heat' },
                  { id: 'cyber', label: 'Cyber Plasma', color: '#00eeff', desc: 'Neon grid aura' },
                  { id: 'quantum', label: 'Quantum Phasm', color: '#00ff51', desc: 'Hyper-charged' }
                ].map((trail) => {
                  const isSelected = (me?.activeTrail || 'nebula') === trail.id;
                  return (
                    <button
                      key={trail.id}
                      onClick={() => selectTrail(trail.id as any)}
                      className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all relative overflow-hidden group/btn cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-500/20 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]' 
                          : 'bg-black/40 border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-[0_0_8px_var(--tc)]" style={{ '--tc': trail.color, backgroundColor: trail.color } as any} />
                        <span className="text-[10px] font-semibold text-gray-200">{trail.label}</span>
                      </div>
                      <span className="text-[9px] text-gray-400 mt-0.5 leading-none">{trail.desc}</span>
                      {isSelected && (
                        <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: trail.color }} />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: trail.color }} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
          ) : <div className="w-1" />}

          {/* DYNAMIC LEADERBOARD (Right side) */}
          {showLeaderboard ? (
            <div className="relative pointer-events-auto bg-[#090915]/75 border border-white/5 backdrop-blur-md p-5 rounded-2xl shadow-2xl w-72 space-y-3">
              {/* Close Button / إغلاق */}
              <button 
                onClick={() => setShowLeaderboard(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-all cursor-pointer z-20"
                title="Hide / إخفاء"
              >
                <X size={14} />
              </button>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5 text-amber-400">
                <Award size={16} />
                <h2 className="text-sm font-bold uppercase tracking-wider">COSMIC LEADERBOARD</h2>
              </div>
              <div className="flex items-center gap-1 bg-indigo-500/15 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[10px] text-indigo-300">
                <Users size={10} />
                <span>{leaderboard.length} Arena Players</span>
              </div>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {leaderboard.map((player, idx) => {
                const getRankSymbol = (index: number) => {
                  if (index === 0) return '👑';
                  if (index === 1) return '⭐';
                  if (index === 2) return '✨';
                  return `#${index + 1}`;
                };

                return (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all ${
                      player.isMe 
                        ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]' 
                        : 'bg-black/20 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-bold w-6 text-center ${idx < 3 ? 'text-amber-400 scale-105' : 'text-gray-500'}`}>
                        {getRankSymbol(idx)}
                      </span>
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_6px_var(--player-dot)]" style={{ backgroundColor: player.color, '--player-dot': player.color } as any} />
                      <span className={`text-[12px] font-semibold truncate ${player.isMe ? 'text-white' : 'text-gray-300'}`}>
                        {player.name}
                        {player.isBot && <span className="text-[9px] text-gray-500 font-normal ml-1">[Phantom AI]</span>}
                      </span>
                    </div>

                    <div className="text-right pl-2 shrink-0">
                      <span className="text-xs font-bold text-gray-100">{player.score}</span>
                      <span className="text-[9px] text-gray-500 block">essence</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          ) : <div className="w-1" />}

        </div>

        {/* MIDDLE BLOCKS: RULES MANUAL OVERLAY */}
        {showRules && (
          <div className="relative w-full max-w-lg mx-auto pointer-events-auto bg-[#070710]/80 border border-white/5 backdrop-blur-md p-5 rounded-2xl flex flex-col gap-4 shadow-3xl text-center">
            {/* Close Button / إغلاق */}
            <button 
              onClick={() => setShowRules(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all cursor-pointer z-20"
              title="Close / إغلاق"
            >
              <X size={14} />
            </button>
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-center gap-1.5">
              <Compass size={14} className="animate-spin-slow" />
              Arena Rule Book (طريقة اللعب)
            </h3>
            <div className="grid grid-cols-3 gap-3 text-left">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                <div className="text-xs font-bold text-purple-400 flex items-center gap-1">
                  <Plus size={12} />
                  <span>Spawning (التدفق)</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">
                  Move your cursor. Glow stream emits in your color. Move near Orbs to feed them.
                </p>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                <div className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                  <Flame size={12} />
                  <span>Left Click (السحب)</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">
                  Place a gravity attractor. This pulls streams of particles tightly into targets.
                </p>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                <div className="text-xs font-bold text-pink-400 flex items-center gap-1">
                  <Zap size={12} />
                  <span>Spacebar (الدافع)</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">
                  Drop a repulsor field near Orbs to block and repel enemy dust flows!
                </p>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 mb-0">
              When an Orb absorbs enough particles, it explodes with a shockwave ring. Dominant harvester claims the massive reward! 🚀
            </p>
          </div>
        )}

        {/* BOTTOM ROW: Emotes Panel & Upgrades shop */}
        <div className="flex justify-between items-end w-full">
          
          {/* THE COSMIC EMOTES SPEAKER (Left side bottom) */}
          {showEmotes ? (
            <div className="relative pointer-events-auto bg-[#090915]/75 border border-white/5 backdrop-blur-md p-5 rounded-2xl shadow-2xl w-80 space-y-3 shrink-0">
              {/* Close Button / إغلاق */}
              <button 
                onClick={() => setShowEmotes(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-all cursor-pointer z-20"
                title="Hide / إخفاء"
              >
                <X size={14} />
              </button>
              <div className="border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5 text-pink-400">
                <Radio size={14} className="animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-pink-300">Express Emotes (التعبيرات الفورية)</h3>
              </div>
              <p className="text-[10px] text-gray-400">Emission beams holographic text above your 3D Cursor!</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { text: "☄️ Zooming!", label: "Zooming" },
                { text: "🌌 Energy Burst!", label: "Energy" },
                { text: "🚀 Harvester Max!", label: "Harvester" },
                { text: "👾 Cyber Hack!", label: "Hack" },
                { text: "👑 I claim this!", label: "Claim" },
                { text: "🛰️ Stabilized!", label: "Stable" }
              ].map((emote, idx) => (
                <button
                  key={idx}
                  onClick={() => sendEmote(emote.text)}
                  className="bg-black/40 hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold text-gray-200 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="scale-110">{emote.text.split(' ')[0]}</span>
                  <span className="text-[9px] truncate tracking-wide">{emote.text.substring(emote.text.split(' ')[0].length + 1)}</span>
                </button>
              ))}
            </div>
          </div>
          ) : <div className="w-1" />}
          
          {/* THE COSMIC UPGRADES DECK (Right side) */}
          {showUpgrades ? (
            <div className="relative pointer-events-auto bg-[#090915]/75 border border-white/5 backdrop-blur-md p-5 rounded-2xl shadow-2xl w-80 space-y-4">
              {/* Close Button / إغلاق */}
              <button 
                onClick={() => setShowUpgrades(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-all cursor-pointer z-20"
                title="Hide / إخفاء"
              >
                <X size={14} />
              </button>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Sparkles size={16} />
                <h2 className="text-sm font-bold uppercase tracking-wider">UPGRADES & SHOP</h2>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-500 uppercase block leading-none font-semibold">YOUR CURRENCY</span>
                <span className="text-sm font-extrabold text-[#7c3aed]">{myScore} <span className="text-[10px] text-gray-400 font-normal">pts</span></span>
              </div>
            </div>

            {/* UPGRADE MODULE CARDS */}
            <div className="space-y-3">
              
              {/* SURGE UPGRADE */}
              <div className="bg-black/35 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-bold text-violet-300 block">🌌 Particle Emission (Surge)</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div 
                        key={level} 
                        className={`w-2 h-1.5 rounded-full ${
                          level <= mySurge ? 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.8)]' : 'bg-white/10'
                        }`} 
                      />
                    ))}
                  </div>
                </div>

                {mySurge < 5 ? (
                  <button 
                    onClick={() => buyUpgrade('surge')}
                    disabled={myScore < surgeCost}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      myScore >= surgeCost 
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg cursor-pointer' 
                        : 'bg-white/5 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    🛒 cost: {surgeCost}
                  </button>
                ) : (
                  <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-extrabold px-1.5 py-1">MAX</span>
                )}
              </div>

              {/* ATTRACTOR STRENGTH UPGRADE */}
              <div className="bg-black/35 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-bold text-cyan-300 block">🧲 Attractor Power (Gravity)</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div 
                        key={level} 
                        className={`w-2 h-1.5 rounded-full ${
                          level <= myGravity ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]' : 'bg-white/10'
                        }`} 
                      />
                    ))}
                  </div>
                </div>

                {myGravity < 5 ? (
                  <button 
                    onClick={() => buyUpgrade('gravity')}
                    disabled={myScore < gravityCost}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      myScore >= gravityCost 
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg cursor-pointer' 
                        : 'bg-white/5 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    🛒 cost: {gravityCost}
                  </button>
                ) : (
                  <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-extrabold px-1.5 py-1">MAX</span>
                )}
              </div>

              {/* VACUUM FIELD UPGRADE */}
              <div className="bg-black/35 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-bold text-emerald-300 block">🌀 Cursor Suction (Vacuum)</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div 
                        key={level} 
                        className={`w-2 h-1.5 rounded-full ${
                          level <= myVacuum ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-white/10'
                        }`} 
                      />
                    ))}
                  </div>
                </div>

                {myVacuum < 5 ? (
                  <button 
                    onClick={() => buyUpgrade('vacuum')}
                    disabled={myScore < vacuumCost}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      myScore >= vacuumCost 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer' 
                        : 'bg-white/5 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    🛒 cost: {vacuumCost}
                  </button>
                ) : (
                  <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-extrabold px-1.5 py-1">MAX</span>
                )}
              </div>

            </div>
          </div>
        ) : <div className="w-1" />}

      </div>

        {/* CENTER FLOATING CONTROLLER DOCK (HUD Control Bar) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 bg-[#050510]/95 border border-white/10 px-4 py-2 rounded-full shadow-[0_0_25px_rgba(0,0,0,0.85)] backdrop-blur-md">
          {/* Master Turn On/Off everything toggle */}
          <button
            onClick={() => {
              const allOn = showIdentity && showLeaderboard && showEmotes && showUpgrades;
              setShowIdentity(!allOn);
              setShowLeaderboard(!allOn);
              setShowEmotes(!allOn);
              setShowUpgrades(!allOn);
            }}
            className="p-1 px-2.5 rounded-full text-[10px] font-extrabold uppercase transition-all bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center gap-1 cursor-pointer"
            title={(showIdentity && showLeaderboard && showEmotes && showUpgrades) ? "Hide All UI / إخفاء الكل" : "Show All UI / إظهار الكل"}
          >
            {(showIdentity && showLeaderboard && showEmotes && showUpgrades) ? (
              <>
                <EyeOff size={12} className="text-red-400" />
                <span>Hide All (إخفاء الكل)</span>
              </>
            ) : (
              <>
                <Eye size={12} className="text-cyan-400 animate-pulse" />
                <span>Show All (إظهار الكل)</span>
              </>
            )}
          </button>
          
          <div className="w-[1px] h-4 bg-white/10 shrink-0 mx-1" />

          {/* Quick toggle list */}
          {[
            { id: 'identity', label: 'ID (المسجل)', active: showIdentity, toggle: () => setShowIdentity(!showIdentity), color: 'border-cyan-500/50 text-cyan-400 bg-cyan-500/5' },
            { id: 'leaderboard', label: 'Rank (الترتيب)', active: showLeaderboard, toggle: () => setShowLeaderboard(!showLeaderboard), color: 'border-amber-500/50 text-amber-400 bg-amber-500/5' },
            { id: 'emotes', label: 'Emotes (التعبير)', active: showEmotes, toggle: () => setShowEmotes(!showEmotes), color: 'border-pink-500/50 text-pink-400 bg-pink-500/5' },
            { id: 'upgrades', label: 'Shop (المتجر)', active: showUpgrades, toggle: () => setShowUpgrades(!showUpgrades), color: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5' },
            { id: 'rules', label: 'Rules (التعليمات)', active: showRules, toggle: () => setShowRules(!showRules), color: 'border-indigo-500/50 text-indigo-400 bg-indigo-500/5' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={item.toggle}
              className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all cursor-pointer whitespace-nowrap ${
                item.active 
                  ? `border-solid ${item.color} shadow-[0_0_8px_rgba(255,255,255,0.05)]` 
                  : 'bg-black/45 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/15'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
