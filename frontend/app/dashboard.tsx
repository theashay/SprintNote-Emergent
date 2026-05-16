import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mic, Sparkles, Search, Info } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { colors, radius, shadows, spacing } from '../lib/theme';
import { Text } from '../components/Text';
import AnimatedPressable from '../components/Pressable';
import TabPills from '../components/TabPills';
import NoteCard, { Note } from '../components/NoteCard';
import { api } from '../lib/api';
import { useAuth, useUI } from '../lib/store';

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const { selectedFolder, setSelectedFolder } = useUI();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user]);

  const notesQuery = useQuery({
    queryKey: ['notes', selectedFolder],
    queryFn: () =>
      api.listNotes({
        folder:
          selectedFolder === 'All Notes' || selectedFolder === 'Favorites'
            ? undefined
            : selectedFolder,
        favorite: selectedFolder === 'Favorites' ? true : undefined,
      }),
    enabled: !!user,
    placeholderData: (prev) => prev, // Keeps old list visible while loading new one
  });

  const foldersQuery = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.listFolders(),
    enabled: !!user,
  });

  const notes: Note[] = (notesQuery.data?.notes as Note[]) || [];
  const tabs = useMemo(() => {
    const fset = new Set(['All Notes', 'Favorites']);
    foldersQuery.data?.folders.forEach((f) => {
      if (f.name !== 'Uncategorized') fset.add(f.name);
    });
    return Array.from(fset);
  }, [foldersQuery.data]);

  const used = (foldersQuery.data?.folders || []).reduce((a, f) => a + f.count, 0);
  const quota = user?.plan === 'pro' ? 9999 : 50;

  // Prefetch Favorites and other folders for instant switching
  useEffect(() => {
    if (user && foldersQuery.data) {
      // Prefetch Favorites
      qc.prefetchQuery({
        queryKey: ['notes', 'Favorites'],
        queryFn: () => api.listNotes({ favorite: true }),
        staleTime: 1000 * 60,
      });
      // Prefetch first 2 custom folders
      foldersQuery.data.folders.slice(0, 2).forEach(f => {
        qc.prefetchQuery({
          queryKey: ['notes', f.name],
          queryFn: () => api.listNotes({ folder: f.name }),
          staleTime: 1000 * 60,
        });
      });
      // Prefetch first 5 notes' details for instant opening
      notes.slice(0, 5).forEach(n => {
        qc.prefetchQuery({
          queryKey: ['note', n.note_id],
          queryFn: () => api.getNote(n.note_id),
          staleTime: 1000 * 60,
        });
      });
    }
  }, [user, foldersQuery.data, qc, notes]);

  // FAB pulse animation
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.32 - pulse.value * 0.22,
    transform: [{ scale: 1 + pulse.value * 0.45 }],
  }));

  const showInfo = () => {
    Alert.alert(
      'About SprintNote',
      'SprintNote turns your spoken thoughts into clear, structured text using advanced AI.\n\nThink of it as your personal thinking partner—just record your voice and let the AI polish your ideas into professional notes.',
      [{ text: 'Got it' }]
    );
  };

  const renderHeader = () => (
    <View>
      {/* Top icon row */}
      <View style={styles.topRow}>
        <AnimatedPressable testID="profile-btn" onPress={() => router.push('/settings')} style={styles.iconBtn}>
          <View style={styles.avatar}>
            <Text style={{ color: colors.white, fontWeight: '700', fontSize: 15 }}>
              {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        </AnimatedPressable>
        <AnimatedPressable testID="paywall-pill" onPress={() => router.push('/paywall')} style={styles.proPill} scaleTo={0.95}>
          <Sparkles size={13} color={colors.primary} />
          <Text variant="caption" color={colors.primary} style={{ marginLeft: 6, fontWeight: '700' }}>
            Explore Pro
          </Text>
        </AnimatedPressable>
        <AnimatedPressable testID="info-btn" onPress={showInfo} style={styles.iconBtn}>
          <Info size={20} color={colors.textPrimary} />
        </AnimatedPressable>
      </View>

      {/* Hero title */}
      <View style={styles.heroBlock}>
        <Text style={styles.heroTitle}>SprintNote</Text>
        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 6, letterSpacing: 1.2 }}>
          THINK · SPEAK · WRITE
        </Text>
      </View>

      {/* Tab pills */}
      <View style={styles.tabsWrap}>
        <TabPills options={tabs} value={selectedFolder} onChange={setSelectedFolder} testID="folder-tabs" />
      </View>

      {/* Search */}
      <AnimatedPressable testID="search-bar" onPress={() => router.push('/search')} style={styles.searchBar} scaleTo={0.99}>
        <Search size={17} color={colors.textTertiary} />
        <Text variant="body" color={colors.textTertiary} style={{ marginLeft: 10 }}>
          Search notes
        </Text>
      </AnimatedPressable>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Mic size={28} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>A quiet canvas{'\n'}for your loudest ideas</Text>
      <Text variant="body" color={colors.textSecondary} style={styles.emptySub}>
        Tap the microphone to capture your first thought.{'\n'}SprintNote will turn it into clear, sharable text.
      </Text>
    </View>
  );

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="dashboard-screen">
      <FlatList
        testID="note-list"
        data={notes}
        keyExtractor={(n, i) => n.note_id || `note-${i}`}
        renderItem={({ item }) => <NoteCard note={item} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!notesQuery.isLoading ? renderEmpty : null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isManualRefreshing}
            onRefresh={async () => {
              setIsManualRefreshing(true);
              await Promise.all([notesQuery.refetch(), foldersQuery.refetch()]);
              setIsManualRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
      />

      {/* Quota pill */}
      {notes.length > 0 ? (
        <View style={styles.quotaPill} pointerEvents="none">
          <Text variant="small" color={colors.white} style={{ fontWeight: '600' }}>
            {used}/{quota} notes saved
          </Text>
        </View>
      ) : null}

      {/* FAB */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <Animated.View style={[styles.pulseRing, pulseStyle]} />
        <AnimatedPressable testID="record-fab" onPress={() => router.push('/recording')} style={styles.fab} scaleTo={0.9}>
          <Mic size={32} color={colors.white} />
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 200,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 30,
    height: 30,
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
    paddingVertical: 9,
    borderRadius: 999,
  },
  heroBlock: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  heroTitle: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 44,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -1.2,
    lineHeight: 50,
  },
  tabsWrap: {
    marginHorizontal: -spacing.md,
    marginBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: spacing.md,
  },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: spacing.md },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptySub: { textAlign: 'center', marginTop: 10, lineHeight: 22 },
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
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  firstLoad: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
