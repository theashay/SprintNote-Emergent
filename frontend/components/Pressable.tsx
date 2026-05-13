import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, radius, shadows } from '../lib/theme';

type Props = {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: boolean;
  testID?: string;
  disabled?: boolean;
};

export default function AnimatedPressable({
  onPress,
  children,
  style,
  scaleTo = 0.96,
  testID,
  disabled,
}: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPressIn={() => (scale.value = withSpring(scaleTo, { mass: 0.6, damping: 14 }))}
      onPressOut={() => (scale.value = withSpring(1, { mass: 0.6, damping: 14 }))}
      onPress={onPress}
    >
      <Animated.View style={[animStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  testID,
}: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 20,
    ...shadows.sm,
  },
});
