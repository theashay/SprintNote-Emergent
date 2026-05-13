import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Heart, Lock } from 'lucide-react-native';
import AnimatedPressable, { Card } from './Pressable';
import { Text } from './Text';
import { colors, spacing, typography } from '../lib/theme';

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
  const excerpt = (note.polished || note.transcript || '').replace(/\n+/g, ' ').slice(0, 140);
  return (
    <AnimatedPressable
      testID={`note-card-${note.note_id}`}
      onPress={() => router.push(`/note/${note.note_id}`)}
      style={{ marginBottom: spacing.md }}
      scaleTo={0.985}
    >
      <Card>
        <View style={styles.headerRow}>
          <View style={styles.badge}>
            <Lock size={11} color={colors.textTertiary} />
            <Text variant="small" color={colors.textTertiary} style={{ marginLeft: 4 }}>
              {note.folder || 'Private'}
            </Text>
          </View>
          {note.favorite ? <Heart size={16} color={colors.primary} fill={colors.primary} /> : null}
        </View>
        <Text style={[typography.h3 as any, { marginTop: spacing.sm, color: colors.textPrimary }]} numberOfLines={2}>
          {note.title || 'Untitled note'}
        </Text>
        {excerpt ? (
          <Text variant="body" color={colors.textSecondary} style={{ marginTop: 6 }} numberOfLines={2}>
            {excerpt}
          </Text>
        ) : null}
        <View style={styles.footerRow}>
          <Text variant="caption" color={colors.textTertiary}>
            {formatDate(note.created_at)}
          </Text>
          {note.style ? (
            <View style={styles.styleChip}>
              <Text variant="small" color={colors.primary}>
                {note.style}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
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
