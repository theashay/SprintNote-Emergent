import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Sparkles, X, Crown } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { Text } from '../components/Text';
import AnimatedPressable from '../components/Pressable';

const FEATURES = [
  'Unlimited voice notes',
  'All 7 AI rewrite styles',
  'Priority OpenAI Whisper transcription',
  'Export to PDF, Markdown, TXT',
  'Custom AI writing styles',
  'Cloud sync across devices',
];

export default function Paywall() {
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="paywall-screen">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <AnimatedPressable testID="close-paywall" onPress={() => router.back()} style={styles.iconBtn}>
            <X size={20} color={colors.textPrimary} />
          </AnimatedPressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.crownBox}>
            <Crown size={28} color={colors.white} />
          </View>
          <Text style={[typography.h1 as any, { textAlign: 'center', marginTop: spacing.md }]}>
            Unlock SprintNote Pro
          </Text>
          <Text variant="bodyLg" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 6 }}>
            More notes. Smarter rewrites. Cleaner output.
          </Text>
        </View>

        <View style={styles.cardsRow}>
          <PriceCard
            label="Monthly"
            price="$8.99"
            period="/month"
            selected={plan === 'monthly'}
            onPress={() => setPlan('monthly')}
            testID="plan-monthly"
          />
          <PriceCard
            label="Annual"
            price="$69"
            period="/year"
            badge="Save 36%"
            selected={plan === 'annual'}
            onPress={() => setPlan('annual')}
            testID="plan-annual"
          />
        </View>

        <View style={styles.featuresBox}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <View style={styles.checkDot}>
                <Check size={13} color={colors.white} />
              </View>
              <Text variant="body" color={colors.textPrimary}>{f}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.ctaWrap}>
        <AnimatedPressable testID="upgrade-btn" onPress={() => router.back()} style={styles.cta} scaleTo={0.97}>
          <Sparkles size={18} color={colors.white} />
          <Text style={{ color: colors.white, fontWeight: '700', fontSize: 16, marginLeft: 8 }}>
            Start 7-day free trial
          </Text>
        </AnimatedPressable>
        <Text variant="small" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 8 }}>
          Cancel anytime · Apple/Google billing
        </Text>
      </View>
    </SafeAreaView>
  );
}

function PriceCard({
  label, price, period, selected, onPress, badge, testID,
}: { label: string; price: string; period: string; selected: boolean; onPress: () => void; badge?: string; testID?: string }) {
  return (
    <AnimatedPressable testID={testID} onPress={onPress} style={[styles.priceCard, selected && styles.priceCardSelected]} scaleTo={0.97}>
      {badge ? (
        <View style={styles.badge}>
          <Text variant="small" color={colors.white} style={{ fontWeight: '700' }}>{badge}</Text>
        </View>
      ) : null}
      <Text variant="caption" color={colors.textSecondary} style={{ fontWeight: '600', letterSpacing: 1 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={[typography.h2 as any, { marginTop: 8 }]}>{price}</Text>
      <Text variant="caption" color={colors.textTertiary}>{period}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', ...shadows.sm,
  },
  hero: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  crownBox: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', ...shadows.lg,
  },
  cardsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  priceCard: {
    flex: 1, padding: spacing.lg, borderRadius: radius.xl,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.borderLight,
  },
  priceCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  badge: {
    position: 'absolute', top: -10, right: 16,
    backgroundColor: colors.textPrimary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  featuresBox: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.borderLight, gap: spacing.md,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkDot: {
    width: 22, height: 22, borderRadius: 999, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.lg, backgroundColor: colors.background,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 999, ...shadows.lg,
  },
});
