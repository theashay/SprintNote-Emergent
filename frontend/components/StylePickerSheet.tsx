import React, { useEffect } from 'react';
import { Modal, View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { X, Check, Sparkles, FileText, ListChecks, BookOpen, Newspaper, ClipboardList, Briefcase } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import AnimatedPressable from './Pressable';
import { Text } from './Text';

type Style = 'Clear & Simple' | 'Bullet Summary' | 'Professional Notes' | 'Meeting Minutes' | 'Journal' | 'Blog Draft' | 'Task List';
type Level = 'Low' | 'Medium' | 'High';

const STYLES: { key: Style; icon: any; description: string }[] = [
  { key: 'Clear & Simple', icon: Sparkles, description: 'Friendly, flowing simple sentences. Prioritize clarity.' },
  { key: 'Bullet Summary', icon: ListChecks, description: 'A tight bulleted list. Each idea in one bullet.' },
  { key: 'Professional Notes', icon: Briefcase, description: 'Polished, executive tone with key terms bolded.' },
  { key: 'Meeting Minutes', icon: ClipboardList, description: 'Agenda, discussion, decisions, action items.' },
  { key: 'Journal', icon: BookOpen, description: 'First-person reflective entry, preserves your voice.' },
  { key: 'Blog Draft', icon: Newspaper, description: 'Hook, 3-5 paragraphs, closing takeaway.' },
  { key: 'Task List', icon: FileText, description: 'Extract every action item as a checkbox.' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply: (style: Style, level: Level) => void;
  initialStyle?: Style;
  initialLevel?: Level;
};

export default function StylePickerSheet({ visible, onClose, onApply, initialStyle = 'Clear & Simple', initialLevel = 'Medium' }: Props) {
  const [selectedStyle, setSelectedStyle] = React.useState<Style>(initialStyle);
  const [level, setLevel] = React.useState<Level>(initialLevel);
  const translateY = useSharedValue(800);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      overlayOpacity.value = withTiming(1, { duration: 280 });
    } else {
      translateY.value = withTiming(800, { duration: 220 });
      overlayOpacity.value = withTiming(0, { duration: 220 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} testID="style-sheet-overlay" />
      </Animated.View>
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={[typography.h3 as any]} testID="style-sheet-title">Rewriting Level & Style</Text>
          <AnimatedPressable onPress={onClose} testID="close-style-sheet">
            <View style={styles.closeBtn}><X size={18} color={colors.textPrimary} /></View>
          </AnimatedPressable>
        </View>

        <View style={styles.levelRow}>
          {(['Low', 'Medium', 'High'] as Level[]).map((l) => {
            const sel = l === level;
            return (
              <AnimatedPressable
                key={l}
                testID={`level-${l}`}
                style={[styles.levelPill, sel && styles.levelPillSelected]}
                onPress={() => setLevel(l)}
                scaleTo={0.93}
              >
                <Text style={{ color: sel ? colors.white : colors.textSecondary, fontWeight: '600' }}>{l}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: spacing.md }} showsVerticalScrollIndicator={false}>
          {STYLES.map((s) => {
            const Icon = s.icon;
            const sel = s.key === selectedStyle;
            return (
              <AnimatedPressable
                key={s.key}
                testID={`style-${s.key}`}
                style={[styles.styleRow, sel && styles.styleRowSelected]}
                onPress={() => setSelectedStyle(s.key)}
                scaleTo={0.98}
              >
                <View style={[styles.styleIcon, { backgroundColor: sel ? colors.primary : colors.primaryLight }]}>
                  <Icon size={18} color={sel ? colors.white : colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[typography.h3 as any, { fontSize: 16, color: colors.textPrimary }]}>{s.key}</Text>
                  <Text variant="caption" color={colors.textSecondary} numberOfLines={2} style={{ marginTop: 2 }}>
                    {s.description}
                  </Text>
                </View>
                {sel ? <Check size={20} color={colors.primary} /> : null}
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        <AnimatedPressable
          testID="apply-style-btn"
          style={styles.applyBtn}
          onPress={() => onApply(selectedStyle, level)}
          scaleTo={0.97}
        >
          <Sparkles size={18} color={colors.white} />
          <Text style={{ color: colors.white, fontWeight: '700', marginLeft: 8, fontSize: 16 }}>
            Apply with AI
          </Text>
        </AnimatedPressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    ...shadows.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    padding: 4,
    marginBottom: spacing.lg,
  },
  levelPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.full,
  },
  levelPillSelected: {
    backgroundColor: colors.primary,
  },
  styleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  styleRowSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primarySoft,
  },
  styleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
