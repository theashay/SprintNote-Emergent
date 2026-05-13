import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';
import AnimatedPressable from './Pressable';
import { Text } from './Text';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';

export type Note = {
  note_id: string;
  title: string;
  transcript: string;
  polished?: string;
  folder?: string;
  favorite?: boolean;
  style?: string;
  created_at: string;
  duration?: number;
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function NoteCard({ note }: { note: Note }) {
  const excerpt = (note.polished || note.transcript || '')
    .replace(/^TITLE:.*\n?/i, '')
    .replace(/\n+/g, ' ')
    .replace(/[#*`]/g, '')
    .trim()
    .slice(0, 160);
  return (
    <AnimatedPressable
      testID={`note-card-${note.note_id}`}
      onPress={() => router.push(`/note/${note.note_id}`)}
      style={{ marginBottom: spacing.md }}
      scaleTo={0.985}
    >
      <View style={styles.card}>
        <Text style={styles.title} numberOfLines={2}>
          {note.title || 'Untitled note'}
        </Text>
        {excerpt ? (
          <Text variant="body" color={colors.textSecondary} style={{ marginTop: 10, lineHeight: 22 }} numberOfLines={3}>
            {excerpt}
          </Text>
        ) : null}
        <View style={styles.footerRow}>
          <Text variant="caption" color={colors.textTertiary}>
            {formatDate(note.created_at)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {note.style ? (
              <View style={styles.styleChip}>
                <Text variant="small" color={colors.primary} style={{ fontWeight: '700' }}>
                  {note.style}
                </Text>
              </View>
            ) : null}
            {note.favorite ? <Heart size={15} color={colors.primary} fill={colors.primary} /> : null}
          </View>
        </View>
      </View>
    </AnimatedPressable>
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
  title: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  styleChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
