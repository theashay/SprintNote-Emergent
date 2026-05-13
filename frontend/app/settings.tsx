import { View, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, User, FileText, Crown, LogOut, Globe, Shield, HelpCircle, Sparkles } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { Text } from '../components/Text';
import AnimatedPressable from '../components/Pressable';
import { useAuth } from '../lib/store';

export default function Settings() {
  const { user, signOut } = useAuth();

  const SECTIONS: { title: string; rows: { icon: any; label: string; sub?: string; onPress?: () => void; danger?: boolean }[] }[] = [
    {
      title: 'ACCOUNT',
      rows: [
        { icon: User, label: 'Profile', sub: user?.email },
        { icon: Crown, label: user?.plan === 'pro' ? 'SprintNote Pro' : 'Upgrade to Pro', onPress: () => router.push('/paywall') },
      ],
    },
    {
      title: 'PREFERENCES',
      rows: [
        { icon: Sparkles, label: 'Default rewrite style', sub: 'Clear & Simple' },
        { icon: Globe, label: 'Language', sub: 'English (auto)' },
        { icon: FileText, label: 'Default export', sub: 'Markdown' },
      ],
    },
    {
      title: 'SUPPORT',
      rows: [
        { icon: HelpCircle, label: 'Help center' },
        { icon: Shield, label: 'Privacy & security' },
      ],
    },
    {
      title: '',
      rows: [
        { icon: LogOut, label: 'Sign out', danger: true, onPress: async () => { await signOut(); router.replace('/login'); } },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="settings-screen">
      <View style={styles.headerRow}>
        <AnimatedPressable testID="settings-back" onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={22} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text style={[typography.h3 as any]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}>
        <View style={styles.profile}>
          <View style={styles.bigAvatar}>
            <Text style={{ color: colors.white, fontWeight: '800', fontSize: 26 }}>
              {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text style={[typography.h2 as any, { marginTop: spacing.md }]}>{user?.name || 'Your account'}</Text>
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>{user?.email}</Text>
        </View>

        {SECTIONS.map((sec, si) => (
          <View key={si} style={{ marginTop: spacing.lg }}>
            {sec.title ? (
              <Text variant="small" color={colors.textTertiary} style={{ letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 }}>
                {sec.title}
              </Text>
            ) : null}
            <View style={styles.group}>
              {sec.rows.map((r, i) => {
                const Icon = r.icon;
                return (
                  <AnimatedPressable
                    key={r.label}
                    testID={`setting-${r.label.replace(/\s/g, '-').toLowerCase()}`}
                    onPress={r.onPress}
                    style={[styles.row, i < sec.rows.length - 1 && styles.rowBorder]}
                    scaleTo={0.99}
                  >
                    <View style={[styles.rowIcon, r.danger && { backgroundColor: '#FEE2E2' }]}>
                      <Icon size={18} color={r.danger ? colors.destructive : colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text variant="body" color={r.danger ? colors.destructive : colors.textPrimary} style={{ fontWeight: '600' }}>
                        {r.label}
                      </Text>
                      {r.sub ? (
                        <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                          {r.sub}
                        </Text>
                      ) : null}
                    </View>
                    {!r.danger ? <ChevronRight size={18} color={colors.textTertiary} /> : null}
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        ))}

        <Text variant="small" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: spacing.xl }}>
          SprintNote v1.0 · Made with care
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', ...shadows.sm,
  },
  profile: { alignItems: 'center', paddingVertical: spacing.lg },
  bigAvatar: {
    width: 84, height: 84, borderRadius: 999, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', ...shadows.lg,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
});
