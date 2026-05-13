import { useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Mic, Settings as SettingsIcon, Sparkles, Search } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { Text } from '../components/Text';
import AnimatedPressable from '../components/Pressable';
import TabPills from '../components/TabPills';
import NoteCard, { Note } from '../components/NoteCard';
import { api } from '../lib/api';
import { useAuth, useUI } from '../lib/store';

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const { selectedFolder, setSelectedFolder } = useUI();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user]);

  const notesQuery = useQuery({
    queryKey: ['notes', selectedFolder],
    queryFn: () => api.listNotes({ folder: selectedFolder === 'All Notes' ? undefined : selectedFolder === 'Favorites' ? undefined : selectedFolder, favorite: selectedFolder === 'Favorites' ? true : undefined }),
    enabled: !!user,
  });
  const foldersQuery = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.listFolders(),
    enabled: !!user,
  });

  const notes: Note[] = (notesQuery.data?.notes as Note[]) || [];
  const tabs = useMemo(() => {
    const fset = new Set(['All Notes', 'Favorites']);
    foldersQuery.data?.folders.forEach((f) => fset.add(f.name));
    return Array.from(fset);
  }, [foldersQuery.data]);

  const used = notes.length;
  const quota = user?.plan === 'pro' ? 9999 : 50;

  // FAB pulse animation
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.35 - pulse.value * 0.25,
    transform: [{ scale: 1 + pulse.value * 0.35 }],
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable testID="profile-btn" onPress={() => router.push('/settings')} style={styles.iconBtn}>
          <View style={styles.avatar}>
            <Text style={{ color: colors.white, fontWeight: '700' }}>
              {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        </AnimatedPressable>
        <AnimatedPressable testID="paywall-pill" onPress={() => router.push('/paywall')}>
          <View style={styles.proPill}>
            <Sparkles size={13} color={colors.primary} />
            <Text variant="caption" color={colors.primary} style={{ marginLeft: 6, fontWeight: '700' }}>
              Explore Pro
            </Text>
          </View>
        </AnimatedPressable>
        <AnimatedPressable testID="settings-btn" onPress={() => router.push('/settings')} style={styles.iconBtn}>
          <SettingsIcon size={20} color={colors.textPrimary} />
        </AnimatedPressable>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[typography.h1 as any, { color: colors.textPrimary }]}>SprintNote</Text>
        <Text variant="body" color={colors.textSecondary} style={{ marginTop: 4 }}>
          {used} {used === 1 ? 'note' : 'notes'} · {user?.name || user?.email}
        </Text>
      </View>

      <AnimatedPressable testID="search-bar" onPress={() => router.push('/search')} style={styles.searchBar}>
        <Search size={18} color={colors.textTertiary} />
        <Text variant="body" color={colors.textTertiary} style={{ marginLeft: 10 }}>
          Search your notes…
        </Text>
      </AnimatedPressable>

      <TabPills options={tabs} value={selectedFolder} onChange={setSelectedFolder} testID="folder-tabs" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={notesQuery.isFetching} onRefresh={() => { notesQuery.refetch(); foldersQuery.refetch(); }} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        testID="note-list"
      >
        {notesQuery.isLoading ? (
          <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Mic size={28} color={colors.primary} />
            </View>
            <Text style={[typography.h3 as any, { marginTop: spacing.md }]}>No notes yet</Text>
            <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 6, paddingHorizontal: spacing.lg }}>
              Tap the record button to capture your first thought. SprintNote will turn it into clear text.
            </Text>
          </View>
        ) : (
          notes.map((n) => <NoteCard key={n.note_id} note={n} />)
        )}
      </ScrollView>

      <View style={styles.quotaPill} pointerEvents="none">
        <Text variant="small" color={colors.white} style={{ fontWeight: '600' }}>
          {used}/{quota} notes saved
        </Text>
      </View>

      <View style={styles.fabWrap} pointerEvents="box-none">
        <Animated.View style={[styles.pulseRing, pulseStyle]} />
        <AnimatedPressable testID="record-fab" onPress={() => router.push('/recording')} style={styles.fab} scaleTo={0.92}>
          <Mic size={32} color={colors.white} />
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  titleBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  searchBar: {
    marginHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 160,
  },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabWrap: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  pulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  quotaPill: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    ...shadows.md,
  },
});
