import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, radius } from '../lib/theme';

type Props = { active?: boolean; size?: 'sm' | 'md' | 'lg' };

const BAR_COUNT = 22;

export default function Waveform({ active = true, size = 'md' }: Props) {
  return (
    <View style={[styles.row, size === 'sm' ? styles.rowSm : null]} testID="waveform">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <Bar key={i} index={i} active={active} size={size} />
      ))}
    </View>
  );
}

function Bar({ index, active, size }: { index: number; active: boolean; size: 'sm' | 'md' | 'lg' }) {
  const baseMax = size === 'sm' ? 22 : size === 'lg' ? 80 : 56;
  const baseMin = size === 'sm' ? 6 : 10;
  const h = useSharedValue(baseMin);
  useEffect(() => {
    if (!active) {
      h.value = withTiming(baseMin, { duration: 250 });
      return;
    }
    const target = baseMin + Math.abs(Math.sin((index + 1) * 0.7)) * (baseMax - baseMin);
    const duration = 320 + (index % 6) * 60;
    h.value = withRepeat(
      withTiming(target, { duration, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [active, index]);

  const style = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[styles.bar, style, { width: size === 'sm' ? 3 : 4 }]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 96,
    gap: 4,
  },
  rowSm: { height: 28 },
  bar: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    width: 4,
  },
});
