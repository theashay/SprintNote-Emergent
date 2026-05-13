import { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, X } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../lib/theme';
import { Text } from '../components/Text';
import AnimatedPressable from '../components/Pressable';
import NoteCard from '../components/NoteCard';
import { api } from '../lib/api';

const POPULAR = ['Today', 'Ideas', 'Meeting', 'Journal', 'Tasks', 'Inspiration'];

export default function Search() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => api.listNotes({ q: debounced || undefined }),
  });
  const notes = data?.notes || [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="search-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerRow}>
          <View style={styles.inputWrap}>
            <SearchIcon size={18} color={colors.textTertiary} />
            <TextInput
              testID="search-input"
              placeholder="Search notes"
              autoFocus
              value={q}
              onChangeText={setQ}
              style={styles.input}
              placeholderTextColor={colors.textTertiary}
            />
            {q ? (
              <AnimatedPressable testID="search-clear" onPress={() => setQ('')}>
                <X size={18} color={colors.textTertiary} />
              </AnimatedPressable>
            ) : null}
          </View>
          <AnimatedPressable testID="search-cancel" onPress={() => router.back()}>
            <Text variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>
              Cancel
            </Text>
          </AnimatedPressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
          {!q ? (
            <>
              <Text variant="caption" color={colors.textTertiary} style={{ marginBottom: 12, letterSpacing: 1 }}>
                POPULAR
              </Text>
              <View style={styles.tagRow}>
                {POPULAR.map((p) => (
                  <AnimatedPressable
                    key={p}
                    testID={`popular-${p}`}
                    onPress={() => setQ(p)}
                    style={styles.tag}
                    scaleTo={0.93}
                  >
                    <Text variant="caption" color={colors.textPrimary}>
                      {p}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text variant="caption" color={colors.textTertiary} style={{ marginBottom: 12 }}>
                {isFetching ? 'Searching…' : `${notes.length} result${notes.length === 1 ? '' : 's'}`}
              </Text>
              {isFetching && notes.length === 0 ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                notes.map((n: any) => <NoteCard key={n.note_id} note={n} />)
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  input: { flex: 1, fontSize: 16, color: colors.textPrimary },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
