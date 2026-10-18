import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameSessionProps } from '../../types';
import { Colors } from '../../../theme/colors';
import { audioService } from '../../../services/audioService';
import { hapticsService } from '../../../services/hapticsService';
import { Modern } from '../shared/gameTheme';
import {
  MAX_ATTEMPTS,
  PenaltyState,
  ShotResult,
  createPenalty,
  keeperChoice,
  keeperSkillFor,
  resolveShot,
  scoreOf,
  shoot,
} from './penaltyLogic';
import { usePausedRef } from '../shared/usePausedRef';
import { PenaltyPhase, penaltyPrimaryDisabled, penaltyPrimaryLabel } from './penaltyUi';

const GX0 = 0.07;
const GX1 = 0.93;
const GY0 = 0.07;
const GY1 = 0.46;
const ZONE_W = (GX1 - GX0) / 3;
const ZONE_H = (GY1 - GY0) / 2;

type Phase = PenaltyPhase;

function zoneCol(z: number): number {
  return z % 3;
}
function zoneRow(z: number): number {
  return Math.floor(z / 3);
}
function zoneCx(z: number): number {
  return GX0 + ZONE_W * (zoneCol(z) + 0.5);
}
function zoneCy(z: number): number {
  return GY0 + ZONE_H * (zoneRow(z) + 0.75);
}

const RESULT_LABEL: Record<ShotResult, string> = { goal: 'GOAL!', saved: 'SAVED!', miss: 'WIDE!' };
const RESULT_COLOR: Record<ShotResult, string> = {
  goal: Colors.accent,
  saved: Modern.pink,
  miss: Modern.amber,
};

export const PenaltyShootoutGame: React.FC<GameSessionProps> = ({ onScoreUpdate, onGameOver, onExit, isMuted, isHapticsEnabled, isPaused }) => {
  const [area, setArea] = useState({ w: 340, h: 480 });
  const [state, setState] = useState<PenaltyState>(createPenalty);
  const [phase, setPhase] = useState<Phase>('aim');
  const [zone, setZone] = useState<number | null>(null);
  const [keeperZone, setKeeperZone] = useState<number | null>(null);
  const [result, setResult] = useState<ShotResult | null>(null);
  const [meter, setMeter] = useState(0.5);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const finishedRef = useRef(false);
  const pausedRef = usePausedRef(isPaused);

  useEffect(() => {
    onScoreUpdate(scoreOf(state));
  }, [state, onScoreUpdate]);

  useEffect(() => {
    if (state.outcome === 'over' && !finishedRef.current) {
      finishedRef.current = true;
      if (!isMuted) audioService.playSound(state.goals >= 3 ? 'victory' : 'game_over');
      if (isHapticsEnabled) (state.goals >= 3 ? hapticsService.success : hapticsService.error)();
      onGameOver(scoreOf(state), { goals: state.goals, attempts: MAX_ATTEMPTS });
    }
  }, [state, onGameOver, isMuted, isHapticsEnabled]);

  useEffect(() => {
    if (phase !== 'meter') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = 0;
      return;
    }
    let dir = 1;
    const loop = (t: number) => {
      if (!lastRef.current) lastRef.current = t;
      const dt = Math.min(0.05, (t - lastRef.current) / 1000);
      lastRef.current = t;
      if (!pausedRef.current) setMeter((m) => {
        let next = m + dir * dt * 1.1;
        if (next > 1) {
          next = 1;
          dir = -1;
        }
        if (next < 0) {
          next = 0;
          dir = 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = 0;
    };
  }, [phase]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  }, []);

  const pickZone = useCallback(
    (z: number) => {
      if (phase !== 'aim') return;
      setZone(z);
      if (!isMuted) audioService.playSound('tap');
      if (isHapticsEnabled) hapticsService.selection();
    },
    [phase, isMuted, isHapticsEnabled]
  );

  const primary = useCallback(() => {
    if (phase === 'aim') {
      if (zone === null) return;
      setMeter(0.5);
      setPhase('meter');
      return;
    }
    if (phase === 'meter') {
      const accuracy = 1 - Math.abs(meter - 0.5) * 2;
      const r1 = Math.random();
      const r2 = Math.random();
      const target = zone as number;
      const keeper = keeperChoice(target, r1, r2, keeperSkillFor(state.attempt));
      setState((s) => shoot(s, target, accuracy, r1, r2));
      setKeeperZone(keeper);
      setResult(resolveShot(target, keeper, accuracy));
      setPhase('result');
      return;
    }
    if (phase === 'result') {
      if (state.outcome === 'over') {
        setPhase('final');
        return;
      }
      setZone(null);
      setKeeperZone(null);
      setResult(null);
      setPhase('aim');
      return;
    }
    if (phase === 'final') {
      finishedRef.current = false;
      setState(createPenalty());
      setZone(null);
      setKeeperZone(null);
      setResult(null);
      setPhase('aim');
      if (!isMuted) audioService.playSound('tap');
    }
  }, [phase, zone, meter, state, isMuted]);

  const px = (n: number) => n * area.w;
  const py = (n: number) => n * area.h;
  const goal = { left: px(GX0), top: py(GY0), width: px(GX1 - GX0), height: py(GY1 - GY0) };

  const btnLabel = penaltyPrimaryLabel(phase, zone !== null, state.outcome === 'over');

  const btnDisabled = penaltyPrimaryDisabled(phase, zone !== null);

  return (
    <View style={styles.container}>
      <View style={styles.hud}>
        <View style={[styles.pill, styles.pillAccent]}>
          <Ionicons name="football" size={15} color={Modern.accent} />
          <Text style={styles.pillText}>{state.goals}/{state.attempt}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="flag-outline" size={15} color={Modern.amber} />
          <Text style={styles.pillText}>Kick {Math.min(state.attempt + 1, MAX_ATTEMPTS)}/{MAX_ATTEMPTS}</Text>
        </View>
      </View>

      <View style={styles.area} onLayout={onLayout}>
        <View style={styles.grass} />

        {/* Goal frame */}
        <View style={[styles.goalFrame, goal]} />

        {/* Zones */}
        {[0, 1, 2, 3, 4, 5].map((z) => {
          const isPicked = zone === z;
          const isKeeper = phase !== 'aim' && keeperZone === z;
          const isTarget = result !== null && zone === z;
          return (
            <TouchableOpacity
              key={z}
              activeOpacity={0.8}
              onPress={() => pickZone(z)}
              disabled={phase !== 'aim'}
              style={[
                styles.zone,
                {
                  left: px(GX0 + ZONE_W * zoneCol(z)),
                  top: py(GY0 + ZONE_H * zoneRow(z)),
                  width: px(ZONE_W),
                  height: py(ZONE_H),
                },
                isPicked && styles.zonePicked,
                isTarget && { borderColor: RESULT_COLOR[result as ShotResult], borderWidth: 3 },
                isKeeper && styles.zoneKeeper,
              ]}
            >
              {isPicked && <Ionicons name="locate" size={18} color={Modern.accent} />}
            </TouchableOpacity>
          );
        })}

        {/* Net lines (decorative) */}
        <View style={[styles.netH, { top: py(GY0 + ZONE_H), left: px(GX0), width: px(GX1 - GX0) }]} />
        <View style={[styles.netV, { left: px(GX0 + ZONE_W), top: py(GY0), height: py(GY1 - GY0) }]} />
        <View style={[styles.netV, { left: px(GX0 + ZONE_W * 2), top: py(GY0), height: py(GY1 - GY0) }]} />

        {/* Keeper */}
        <View
          pointerEvents="none"
          style={[
            styles.keeper,
            {
            left: px(phase === 'result' && keeperZone !== null ? zoneCx(keeperZone) : 0.5) - 14,
            top: py(phase === 'result' && keeperZone !== null ? zoneCy(keeperZone) : GY1 - 0.06) - 10,
            },
          ]}
        >
          <View style={styles.keeperBody} />
          <View style={styles.keeperHead} />
        </View>

        {/* Ball */}
        <View
          pointerEvents="none"
          style={[
            styles.ball,
            {
              left: px(phase === 'result' && zone !== null ? zoneCx(zone) : 0.5) - 11,
              top: py(phase === 'result' && zone !== null ? zoneCy(zone) - 0.12 : 0.86) - 11,
            },
          ]}
        />

        {/* Result banner */}
        {phase === 'result' && result && (
          <View pointerEvents="none" style={styles.resultBanner}>
            <Text style={[styles.resultText, { color: RESULT_COLOR[result] }]}>{RESULT_LABEL[result]}</Text>
          </View>
        )}

        {/* Accuracy meter */}
        {phase === 'meter' && (
          <View style={styles.meterWrap}>
            <View style={styles.meterTrack}>
              <View style={styles.meterSweet} />
              <View style={[styles.meterMarker, { left: `${meter * 100}%` }]} />
            </View>
            <Text style={styles.meterHint}>Tap Shoot when the marker is in the centre</Text>
          </View>
        )}

        {phase === 'aim' && zone === null && (
          <View style={styles.prompt} pointerEvents="none">
            <Text style={styles.promptText}>TAP A CORNER OF THE GOAL</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, btnDisabled && styles.disabled]}
          onPress={primary}
          disabled={btnDisabled}
          activeOpacity={0.85}
        >
          <Ionicons name={phase === 'meter' ? 'football' : 'arrow-forward'} size={18} color={Colors.textInverse} />
          <Text style={styles.primaryBtnText}>{btnLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onExit} style={styles.exitRow}>
          <Ionicons name="chevron-back" size={16} color={Modern.inkMuted} />
          <Text style={styles.exitText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Colors.background },
  hud: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Modern.surface, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: Modern.border },
  pillAccent: { borderColor: Modern.sky, backgroundColor: 'rgba(56,189,248,0.12)' },
  pillText: { color: Modern.ink, fontSize: 15, fontWeight: '800' },
  area: { flex: 1, backgroundColor: '#E8F2FB', borderRadius: Modern.radius, overflow: 'hidden', borderWidth: 2, borderColor: Modern.sky },
  grass: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%', backgroundColor: '#5EA85B' },
  goalFrame: { position: 'absolute', borderWidth: 4, borderColor: '#FFFFFF', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.10)' },
  zone: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 4 },
  zonePicked: { backgroundColor: 'rgba(14,165,233,0.35)', borderColor: Modern.accent },
  zoneKeeper: { backgroundColor: 'rgba(236,72,153,0.28)', borderColor: Modern.pink },
  netH: { position: 'absolute', height: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
  netV: { position: 'absolute', width: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
  keeper: { position: 'absolute', width: 28, height: 34, alignItems: 'center' },
  keeperBody: { width: 24, height: 26, borderRadius: 6, backgroundColor: Modern.pink, marginTop: 8 },
  keeperHead: { position: 'absolute', top: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: '#F2C29B' },
  ball: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#D9D4CC', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  resultBanner: { position: 'absolute', top: '52%', left: 0, right: 0, alignItems: 'center' },
  resultText: { fontSize: 34, fontWeight: '900', letterSpacing: 2 },
  meterWrap: { position: 'absolute', bottom: 14, left: 20, right: 20, alignItems: 'center' },
  meterTrack: { width: '100%', height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.9)', overflow: 'hidden', position: 'relative' },
  meterSweet: { position: 'absolute', left: '34%', width: '32%', top: 0, bottom: 0, backgroundColor: 'rgba(16,185,129,0.45)' },
  meterMarker: { position: 'absolute', top: 0, bottom: 0, width: 4, marginLeft: -2, backgroundColor: Modern.accent },
  meterHint: { marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.95)', fontWeight: '700' },
  prompt: { position: 'absolute', bottom: 14, left: 0, right: 0, alignItems: 'center' },
  promptText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Modern.accent, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20 },
  primaryBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14 },
  exitRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  exitText: { color: Modern.inkMuted, fontSize: 13, fontWeight: '700' },
});
