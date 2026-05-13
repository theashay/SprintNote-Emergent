import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSequence, withDelay, Easing } from 'react-native-reanimated';
import { Mic } from 'lucide-react-native';
import { colors, spacing, typography } from '../lib/theme';
import { useAuth } from '../lib/store';
import { Text } from '../components/Text';

export default function Splash() {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const { user, loading } = useAuth();

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    scale.value = withSequence(
      withTiming(1.05, { duration: 500 }),
      withTiming(1, { duration: 200 }),
    );
  }, []);

  useEffect(() => {
    if (loading) return;
    const timeout = setTimeout(() => {
      if (user) router.replace('/dashboard');
      else router.replace('/onboarding');
    }, 1100);
    return () => clearTimeout(timeout);
  }, [user, loading]);

  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.container} testID="splash-screen">
      <Animated.View style={[styles.logoWrap, aStyle]}>
        <View style={styles.logoBox}>
          <Mic size={36} color={colors.white} />
        </View>
        <Text style={[typography.h1 as any, { marginTop: spacing.md, color: colors.textPrimary }]}>
          SprintNote
        </Text>
        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4, letterSpacing: 1 }}>
          THINK · SPEAK · WRITE
        </Text>
      </Animated.View>
      <View style={{ position: 'absolute', bottom: 80 }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: { alignItems: 'center' },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
});
