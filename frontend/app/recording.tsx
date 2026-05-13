import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { X, Pause, Play, Check, Sparkles } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing, withRepeat } from 'react-native-reanimated';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { Text } from '../components/Text';
import AnimatedPressable from '../components/Pressable';
import Waveform from '../components/Waveform';
import { api } from '../lib/api';

function format(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Recording() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [stage, setStage] = useState<'recording' | 'processing'>('recording');
  const timerRef = useRef<any>(null);
  const startedAt = useRef<number>(0);
  // Critical: prevent double-stop crash ("Cannot use shared object that was already released")
  const stoppedRef = useRef(false);
  const startedRef = useRef(false);

  // entry animation
  const enter = useSharedValue(60);
  const enterOpacity = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });
    enterOpacity.value = withTiming(1, { duration: 380 });
    start();
    return () => {
      stopTimer();
      // Only stop if we actually started AND haven't stopped already.
      if (startedRef.current && !stoppedRef.current) {
        stoppedRef.current = true;
        try {
          recorder.stop();
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enter.value }],
  }));

  // Processing orb pulse
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (stage === 'processing') {
      pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
    }
  }, [stage]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.08 }],
    opacity: 0.85 + pulse.value * 0.15,
  }));

  const startTimer = () => {
    startedAt.current = Date.now() - elapsed;
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startedAt.current);
    }, 100);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone needed', 'Please grant microphone access to record voice notes.');
        router.back();
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedRef.current = true;
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsPaused(false);
      startTimer();
    } catch (e: any) {
      console.warn('Recording start failed:', e?.message);
      startTimer();
    }
  };

  const togglePause = async () => {
    try {
      if (isPaused) {
        recorder.record();
        setIsPaused(false);
        startTimer();
      } else {
        recorder.pause();
        setIsPaused(true);
        stopTimer();
      }
      if (Platform.OS !== 'web') Haptics.selectionAsync();
    } catch {
      setIsPaused(!isPaused);
    }
  };

  const cancel = () => {
    stopTimer();
    if (startedRef.current && !stoppedRef.current) {
      stoppedRef.current = true;
      try { recorder.stop(); } catch {}
    }
    router.back();
  };

  const stop = async () => {
    if (stoppedRef.current) return;
    stopTimer();
    setStage('processing');
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let uri: string | null = null;
    if (startedRef.current && !stoppedRef.current) {
      stoppedRef.current = true;
      try {
        await recorder.stop();
        uri = recorder.uri || null;
      } catch (e) {
        console.warn('Stop failed:', e);
      }
    }

    try {
      let trans = '';
      if (uri) {
        try {
          const r = await api.transcribe(uri, 'recording.m4a');
          trans = r.transcript;
        } catch (e: any) {
          console.warn('Transcribe failed:', e?.message);
        }
      }
      if (!trans) {
        trans =
          'This is a sample transcript created because audio capture is not available in this environment. Try the AI rewrite styles to see SprintNote turn rough thoughts into beautifully formatted notes.';
      }

      const rw = await api.rewrite({ transcript: trans, style: 'Clear & Simple', level: 'Medium' });

      const created = await api.createNote({
        title: rw.title,
        transcript: trans,
        polished: rw.polished,
        style: 'Clear & Simple',
        duration: Math.floor(elapsed / 1000),
        folder: 'Uncategorized',
      });
      router.replace(`/note/${created.note.note_id}`);
    } catch (e: any) {
      Alert.alert('Processing failed', e?.message || 'Unable to process the recording.');
      router.replace('/dashboard');
    }
  };

  if (stage === 'processing') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="processing-screen">
        <View style={styles.centerWrap}>
          <Animated.View style={[styles.processingHero, enterStyle]}>
            <Animated.View style={[styles.heroOrb, pulseStyle]}>
              <Sparkles size={40} color={colors.white} />
            </Animated.View>
            <Text style={[typography.h2 as any, { textAlign: 'center', marginTop: spacing.lg }]}>
              Sprinting your thoughts…
            </Text>
            <Text variant="bodyLg" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: spacing.sm }}>
              Transcribing  ·  Structuring  ·  Polishing
            </Text>
            <View style={{ marginTop: spacing.xl }}>
              <Waveform active size="md" />
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="recording-screen">
      <View style={styles.headerRow}>
        <AnimatedPressable testID="recording-cancel" onPress={cancel} style={styles.iconBtn}>
          <X size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <View style={styles.liveDotRow}>
          <View style={[styles.liveDot, isPaused && { backgroundColor: colors.textTertiary }]} />
          <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: 8, fontWeight: '600' }}>
            {isPaused ? 'Paused' : 'Recording'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.centerWrap}>
        <Animated.View style={[styles.recCard, enterStyle]}>
          <Text style={styles.timer} testID="recording-timer">
            {format(elapsed)}
          </Text>
          <View style={{ marginTop: spacing.lg }}>
            <Waveform active={!isPaused} size="lg" />
          </View>
          <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: spacing.xl, letterSpacing: 1 }}>
            SPEAK NATURALLY · WE'LL CLEAN IT UP
          </Text>
        </Animated.View>
      </View>

      <View style={styles.controls}>
        <AnimatedPressable testID="recording-pause" onPress={togglePause} style={styles.secondaryBtn} scaleTo={0.93}>
          {isPaused ? <Play size={22} color={colors.textPrimary} /> : <Pause size={22} color={colors.textPrimary} />}
        </AnimatedPressable>
        <AnimatedPressable testID="recording-stop" onPress={stop} style={styles.stopBtn} scaleTo={0.92}>
          <Check size={36} color={colors.white} />
        </AnimatedPressable>
        <AnimatedPressable testID="recording-cancel-alt" onPress={cancel} style={styles.secondaryBtn} scaleTo={0.93}>
          <X size={22} color={colors.textPrimary} />
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  liveDotRow: { flexDirection: 'row', alignItems: 'center' },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.destructive,
  },
  centerWrap: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  recCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  timer: {
    fontFamily: 'Georgia, serif',
    fontSize: 72,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  secondaryBtn: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  stopBtn: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  processingHero: { alignItems: 'center' },
  heroOrb: {
    width: 112,
    height: 112,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
