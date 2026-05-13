import { useRef, useState } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Image, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import { ASSETS, colors, radius, spacing, typography, shadows } from '../lib/theme';
import { Text } from '../components/Text';
import AnimatedPressable from '../components/Pressable';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    img: ASSETS.onboarding[0],
    title: 'From fuzzy thoughts\nto clear text',
    sub: 'SprintNote turns rambling voice notes into beautifully formatted text — instantly.',
  },
  {
    img: ASSETS.onboarding[1],
    title: 'Choose a style.\nGet structure.',
    sub: 'Professional notes, meeting minutes, journals, blog drafts — rewritten with one tap.',
  },
  {
    img: ASSETS.onboarding[2],
    title: 'Your second brain.\nAlways with you.',
    sub: 'Search, fold, favorite. Your ideas, organized — wherever inspiration strikes.',
  },
];

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <View style={styles.imageWrap}>
              <Image source={{ uri: item.img }} style={styles.image} />
              <View style={styles.imageOverlay} />
            </View>
            <View style={styles.content}>
              <Text style={[typography.h1 as any, { color: colors.textPrimary }]}>
                {item.title}
              </Text>
              <Text variant="bodyLg" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
                {item.sub}
              </Text>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index ? styles.dotActive : null]}
            />
          ))}
        </View>
        <View style={styles.actions}>
          <AnimatedPressable testID="skip-onboarding" onPress={() => router.replace('/login')}>
            <Text variant="caption" color={colors.textSecondary} style={{ fontSize: 15, fontWeight: '600' }}>
              Skip
            </Text>
          </AnimatedPressable>
          <AnimatedPressable testID="next-onboarding" onPress={next} style={styles.nextBtn}>
            <Text style={{ color: colors.white, fontWeight: '700', fontSize: 16, marginRight: 8 }}>
              {index === SLIDES.length - 1 ? 'Get started' : 'Continue'}
            </Text>
            <ArrowRight size={18} color={colors.white} />
          </AnimatedPressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  imageWrap: {
    height: 380,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  image: { width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(79,70,229,0.08)',
  },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingRight: spacing.xl + 8 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radius.full,
    ...shadows.lg,
  },
});
