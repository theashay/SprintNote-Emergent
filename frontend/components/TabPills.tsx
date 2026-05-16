import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { colors, radius, spacing, typography, shadows } from '../lib/theme';
import AnimatedPressable from './Pressable';
import { Text } from './Text';

type Props = {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  testID?: string;
};

export default function TabPills({ options, value, onChange, testID }: Props) {
  const isFixed = options.length === 2;

  const content = options.map((opt) => {
    const selected = opt === value;
    return (
      <AnimatedPressable
        key={opt}
        testID={`tab-pill-${opt}`}
        onPress={() => onChange(opt)}
        style={[
          styles.pill,
          selected ? styles.pillSelected : styles.pillUnselected,
          isFixed && { flex: 1, alignItems: 'center' },
        ]}
        scaleTo={0.94}
      >
        <Text
          style={[
            typography.caption,
            { color: selected ? colors.textPrimary : colors.textSecondary, fontWeight: '700' },
          ]}
        >
          {opt}
        </Text>
      </AnimatedPressable>
    );
  });

  if (isFixed) {
    return (
      <View style={[styles.container, { paddingRight: spacing.md }]} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      testID={testID}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pill: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: radius.full,
  },
  pillSelected: {
    backgroundColor: colors.surface,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pillUnselected: {
    backgroundColor: 'transparent',
  },
});
