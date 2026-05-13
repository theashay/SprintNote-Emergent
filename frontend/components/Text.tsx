import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { colors, bodyFamily, typography } from '../lib/theme';

type Variant = 'h1' | 'h2' | 'h3' | 'bodyLg' | 'body' | 'caption' | 'small';

export function Text(props: TextProps & { variant?: Variant; color?: string }) {
  const { style, variant, color, ...rest } = props;
  const base = variant ? (typography as any)[variant] : null;
  return (
    <RNText
      {...rest}
      style={[
        { color: color || colors.textPrimary, fontFamily: bodyFamily },
        base,
        style,
      ]}
    />
  );
}
