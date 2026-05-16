import { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Sparkles, X, Crown } from 'lucide-react-native';
import { colors, shadows, displayFamily } from '../lib/theme';
import { Text } from '../components/Text';
import AnimatedPressable from '../components/Pressable';
import { api } from '../lib/api';
import { useAuth } from '../lib/store';

export default function Paywall() {
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState(false);
  const bootstrap = useAuth((s) => s.bootstrap);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { url } = await api.createPaymentSession(plan);
      await WebBrowser.openBrowserAsync(url);
      await bootstrap();
    } catch (e: any) {
      Alert.alert('Payment Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="paywall-screen">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AnimatedPressable testID="close-paywall" onPress={() => router.back()} style={styles.closeBtn}>
            <X size={22} color={colors.textSecondary} />
          </AnimatedPressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.iconContainer}>
            <Crown size={38} color={colors.white} />
          </View>
          <Text style={styles.title}>Unlock your best thoughts.</Text>
          <Text style={styles.subtitle}>
            Unlimited notes, priority transcription, and advanced AI rewriting.
          </Text>
        </View>

        <View style={styles.plans}>
          <PlanOption
            title="Annual Membership"
            price="$69 / year"
            description="Best value, $5.75 per month"
            badge="Save 36%"
            selected={plan === 'annual'}
            onPress={() => setPlan('annual')}
          />
          <PlanOption
            title="Monthly Membership"
            price="$8.99 / month"
            description="Flexible, cancel anytime"
            selected={plan === 'monthly'}
            onPress={() => setPlan('monthly')}
          />
        </View>

        <View style={styles.features}>
          <FeatureItem text="Unlimited voice-to-text recording" />
          <FeatureItem text="7+ Professional AI rewrite styles" />
          <FeatureItem text="Priority OpenAI Whisper processing" />
          <FeatureItem text="Secure cloud sync across devices" />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AnimatedPressable style={styles.cta} onPress={handleUpgrade} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Sparkles size={20} color={colors.white} />
              <Text style={styles.ctaText}>Unlock Pro Access</Text>
            </>
          )}
        </AnimatedPressable>
        <Text style={styles.footerNote}>
          Secure payment via Stripe. Auto-renews unless cancelled.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function PlanOption({ title, price, description, badge, selected, onPress }: any) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.planCard, selected && styles.planCardSelected]}
      scaleTo={0.98}
    >
      {badge && (
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{badge.toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.planInfo}>
        <Text style={[styles.planTitle, selected && styles.planTitleSelected]}>{title}</Text>
        <Text style={[styles.planDescription, selected && styles.planDescriptionSelected]}>{description}</Text>
      </View>
      <Text style={[styles.planPriceText, selected && styles.planPriceTextSelected]}>{price.split(' ')[0]}</Text>
    </AnimatedPressable>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Check size={14} color={colors.primary} />
      </View>
      <Text style={styles.featureLabel}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 24, paddingBottom: 160 },
  header: { alignItems: 'flex-end', marginBottom: 8 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', marginBottom: 40 },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
    transform: [{ rotate: '-4deg' }],
  },
  title: {
    fontFamily: displayFamily,
    fontSize: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  plans: { gap: 16, marginBottom: 40 },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  planInfo: { flex: 1 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  planTitleSelected: { color: colors.primary },
  planDescription: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  planDescriptionSelected: { color: colors.textSecondary },
  planPriceText: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  planPriceTextSelected: { color: colors.textPrimary },
  planBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    ...shadows.sm,
    zIndex: 10,
  },
  planBadgeText: { color: colors.white, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  features: { gap: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: { fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 48,
    backgroundColor: colors.background,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 20,
    ...shadows.lg,
  },
  ctaText: { color: colors.white, fontWeight: '700', fontSize: 18, marginLeft: 12 },
  footerNote: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 12,
    color: colors.textTertiary,
  },
});
