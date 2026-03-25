import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ViewStyle, ActivityIndicator,
} from 'react-native';

// ═══════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════

export const Theme = {
  // Primary
  primary: '#6366F1',
  primaryEnd: '#8B5CF6',

  // Backgrounds
  darkBg: '#0F172A',
  lightBg: '#F8FAFC',
  card: '#FFFFFF',
  darkCard: '#1E293B',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Text — light mode
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  // Text — dark mode
  textPrimaryDark: '#FFFFFF',
  textSecondaryDark: '#94A3B8',

  // Status
  red: '#EF4444',
  yellow: '#F59E0B',
  green: '#22C55E',

  // Spacing
  sp: 8,
  pad: 16,

  // Radii
  radiusXs: 8,
  radiusSm: 12,
  radiusMd: 16,
  radiusLg: 20,
  radiusXl: 24,
  radiusFull: 9999,

  // Aliases (backward compat with existing screens)
  bg: '#F8FAFC',
  text: '#0F172A',
  textSec: '#475569',
} as const;

// Severity color map
export const SeverityColor: Record<string, string> = {
  High: Theme.red,
  Medium: Theme.yellow,
  Low: Theme.green,
};

// ═══════════════════════════════════════════
// PRIMARY BUTTON (Gradient-style solid)
// ═══════════════════════════════════════════
// Full-width gradient-feel button. Since RN doesn't
// support CSS gradients natively without a lib, we use
// the primary color with a subtle shadow to mimic depth.

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title, onPress, icon, loading, disabled, style,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    disabled={disabled || loading}
    style={[
      pBtn.root,
      (disabled || loading) && pBtn.disabled,
      style,
    ]}>
    {loading ? (
      <ActivityIndicator color="#fff" size="small" />
    ) : (
      <>
        {icon ? <Text style={pBtn.icon}>{icon}</Text> : null}
        <Text style={pBtn.text}>{title}</Text>
      </>
    )}
  </TouchableOpacity>
);

const pBtn = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Theme.radiusSm,
    backgroundColor: Theme.primary,
    paddingHorizontal: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  disabled: { opacity: 0.55 },
  icon: { fontSize: 16, color: '#fff', marginRight: 8 },
  text: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
});

// ═══════════════════════════════════════════
// SECONDARY BUTTON (Outlined / light)
// ═══════════════════════════════════════════

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title, onPress, icon, disabled, style,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    disabled={disabled}
    style={[sBtn.root, disabled && { opacity: 0.5 }, style]}>
    {icon ? <Text style={sBtn.icon}>{icon}</Text> : null}
    <Text style={sBtn.text}>{title}</Text>
  </TouchableOpacity>
);

const sBtn = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Theme.radiusSm,
    borderWidth: 1.5,
    borderColor: Theme.border,
    backgroundColor: Theme.card,
    paddingHorizontal: 20,
  },
  icon: { fontSize: 14, marginRight: 8 },
  text: { fontSize: 14, fontWeight: '600', color: Theme.textPrimary },
});

// ═══════════════════════════════════════════
// FLOATING ICON BUTTON (Small circular)
// ═══════════════════════════════════════════

interface FloatingIconButtonProps {
  icon: string;
  onPress: () => void;
  size?: number;
  style?: ViewStyle;
}

export const FloatingIconButton: React.FC<FloatingIconButtonProps> = ({
  icon, onPress, size = 44, style,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Theme.card,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        borderWidth: 1,
        borderColor: Theme.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      style,
    ]}>
    <Text style={{ fontSize: size * 0.4, color: Theme.textSecondary }}>{icon}</Text>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════
// SEVERITY BADGE
// ═══════════════════════════════════════════

export const SeverityBadge: React.FC<{ severity: string; style?: ViewStyle }> = ({
  severity, style,
}) => {
  const color = SeverityColor[severity] || Theme.yellow;
  return (
    <View style={[sevBadge.root, { backgroundColor: color + '15' }, style]}>
      <View style={[sevBadge.dot, { backgroundColor: color }]} />
      <Text style={[sevBadge.text, { color }]}>{severity}</Text>
    </View>
  );
};

const sevBadge = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Theme.radiusFull },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '700' },
});
