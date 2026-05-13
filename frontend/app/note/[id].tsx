import { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import {
  ChevronLeft,
  Wand2,
  Trash2,
  Copy,
  Share2,
  Heart,
  Lock,
  Edit3,
  Save,
  X,
  Check,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, radius, shadows, spacing, typography } from '../../lib/theme';
import { Text } from '../../components/Text';
import AnimatedPressable from '../../components/Pressable';
import StylePickerSheet from '../../components/StylePickerSheet';
import { api } from '../../lib/api';

function fDate(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function NoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [styleSheetOpen, setStyleSheetOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: '', polished: '' });
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['note', id],
    queryFn: () => api.getNote(String(id)),
    enabled: !!id,
  });
  const note = data?.note;

  const updateMut = useMutation({
    mutationFn: (body: any) => api.updateNote(String(id), body),
    onSuccess: (d) => {
      qc.setQueryData(['note', id], { note: d.note });
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const rewriteMut = useMutation({
    mutationFn: (params: { style: string; level: string }) =>
      api.rewrite({ transcript: note?.transcript || '', style: params.style, level: params.level }),
    onSuccess: async (r) => {
      if (note) {
        await updateMut.mutateAsync({
          polished: r.polished,
          title: r.title || note.title,
          style: r.style,
        });
        showToast('Rewritten with AI');
      }
    },
    onError: (e: any) => {
      const msg = e?.message || 'AI rewrite failed';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Rewrite failed', msg);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => api.deleteNote(String(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.invalidateQueries({ queryKey: ['folders'] });
      router.back();
    },
  });

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Delete this note?')) deleteMut.mutate();
    } else {
      Alert.alert('Delete note?', 'This action cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate() },
      ]);
    }
  };

  const copyToClipboard = async () => {
    if (!note) return;
    const text = `${note.title}\n\n${note.polished || note.transcript}`;
    try {
      await Clipboard.setStringAsync(text);
      showToast('Copied to clipboard');
    } catch {
      showToast('Copy failed');
    }
  };

  const share = async () => {
    if (!note) return;
    const text = `${note.title}\n\n${note.polished || note.transcript}\n\n— Made with SprintNote`;
    if (Platform.OS === 'web') {
      try {
        // @ts-ignore
        if (navigator.share) await navigator.share({ title: note.title, text });
        else {
          await Clipboard.setStringAsync(text);
          showToast('Copied to clipboard');
        }
      } catch {}
      return;
    }
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        await Clipboard.setStringAsync(text);
        showToast('Copied to clipboard');
        return;
      }
      const filename = `${(note.title || 'note').replace(/[^a-z0-9]/gi, '_').slice(0, 40)}.txt`;
      const uri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, text);
      await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: 'Share note' });
    } catch (e: any) {
      Alert.alert('Share failed', e?.message || 'Could not share note');
    }
  };

  if (isLoading || !note) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const startEdit = () => {
    setDraft({ title: note.title, polished: note.polished || note.transcript });
    setEditing(true);
  };
  const saveEdit = async () => {
    await updateMut.mutateAsync({ title: draft.title, polished: draft.polished });
    setEditing(false);
    showToast('Saved');
  };

  const isProcessing = rewriteMut.isPending || updateMut.isPending;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="note-detail-screen">
      <View style={styles.headerRow}>
        <AnimatedPressable testID="note-back" onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={22} color={colors.textPrimary} />
        </AnimatedPressable>
        <View style={styles.privateBadge}>
          <Lock size={11} color={colors.textTertiary} />
          <Text variant="small" color={colors.textTertiary} style={{ marginLeft: 4 }}>
            private
          </Text>
        </View>
        <AnimatedPressable
          testID="favorite-toggle"
          onPress={() => updateMut.mutate({ favorite: !note.favorite })}
          style={styles.iconBtn}
        >
          <Heart
            size={18}
            color={note.favorite ? colors.primary : colors.textTertiary}
            fill={note.favorite ? colors.primary : 'transparent'}
          />
        </AnimatedPressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center' }}>
          {fDate(note.created_at)}
        </Text>
        {editing ? (
          <TextInput
            testID="title-edit-input"
            style={styles.titleInput}
            value={draft.title}
            onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))}
            placeholder="Title"
            multiline
            placeholderTextColor={colors.textTertiary}
          />
        ) : (
          <Text style={styles.title} testID="note-title">
            {note.title}
          </Text>
        )}
        <View style={styles.divider} />

        {editing ? (
          <TextInput
            testID="body-edit-input"
            style={styles.bodyInput}
            value={draft.polished}
            onChangeText={(v) => setDraft((d) => ({ ...d, polished: v }))}
            placeholder="Your note…"
            multiline
            scrollEnabled={false}
            placeholderTextColor={colors.textTertiary}
          />
        ) : (
          <Text variant="bodyLg" color={colors.textPrimary} style={styles.transcript} testID="note-body">
            {note.polished || note.transcript}
          </Text>
        )}

        {note.style && !editing ? (
          <View style={styles.stylePill}>
            <Wand2 size={12} color={colors.primary} />
            <Text variant="small" color={colors.primary} style={{ marginLeft: 6, fontWeight: '700' }}>
              {note.style}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {toast ? (
        <Animated.View entering={FadeInDown.duration(180)} style={styles.toast} pointerEvents="none">
          <Check size={16} color={colors.white} />
          <Text variant="caption" color={colors.white} style={{ marginLeft: 6, fontWeight: '600' }}>
            {toast}
          </Text>
        </Animated.View>
      ) : null}

      <View style={styles.actionBar}>
        {editing ? (
          <>
            <AnimatedPressable testID="cancel-edit-btn" onPress={() => setEditing(false)} style={styles.smallBtn}>
              <X size={20} color={colors.textPrimary} />
            </AnimatedPressable>
            <AnimatedPressable
              testID="save-edit-btn"
              onPress={saveEdit}
              style={[styles.primaryBtn, { paddingHorizontal: 24 }]}
            >
              <Save size={18} color={colors.white} />
              <Text style={styles.primaryBtnText}>Save</Text>
            </AnimatedPressable>
            <View style={{ width: 48 }} />
          </>
        ) : (
          <>
            <AnimatedPressable testID="delete-note" onPress={confirmDelete} style={styles.smallBtn}>
              <Trash2 size={20} color={colors.textPrimary} />
            </AnimatedPressable>
            <AnimatedPressable testID="edit-note" onPress={startEdit} style={styles.smallBtn}>
              <Edit3 size={20} color={colors.textPrimary} />
            </AnimatedPressable>
            <AnimatedPressable
              testID="rewrite-fab"
              onPress={() => setStyleSheetOpen(true)}
              style={styles.primaryBtn}
              scaleTo={0.94}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Wand2 size={20} color={colors.white} />
              )}
              <Text style={styles.primaryBtnText}>Rewrite</Text>
            </AnimatedPressable>
            <AnimatedPressable testID="copy-note" onPress={copyToClipboard} style={styles.smallBtn}>
              <Copy size={20} color={colors.textPrimary} />
            </AnimatedPressable>
            <AnimatedPressable testID="share-note" onPress={share} style={styles.smallBtn}>
              <Share2 size={20} color={colors.textPrimary} />
            </AnimatedPressable>
          </>
        )}
      </View>

      <StylePickerSheet
        visible={styleSheetOpen}
        onClose={() => setStyleSheetOpen(false)}
        initialStyle={(note.style as any) || 'Clear & Simple'}
        onApply={(style, level) => {
          setStyleSheetOpen(false);
          rewriteMut.mutate({ style, level });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  body: { padding: spacing.lg, paddingBottom: 140, alignItems: 'stretch' },
  title: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 44,
    letterSpacing: -0.8,
    textAlign: 'center',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  titleInput: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    textAlign: 'center',
    color: colors.textPrimary,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
  },
  divider: {
    width: 60,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 999,
    alignSelf: 'center',
    marginVertical: spacing.lg,
  },
  transcript: { lineHeight: 30, fontSize: 18 },
  bodyInput: {
    lineHeight: 28,
    fontSize: 17,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 220,
    textAlignVertical: 'top',
  },
  stylePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
  },
  actionBar: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
  smallBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    ...shadows.md,
  },
  primaryBtnText: { color: colors.white, fontWeight: '700', marginLeft: 8 },
  toast: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
