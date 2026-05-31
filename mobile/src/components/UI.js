/**
 * Shared UI primitives used across all screens.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, TextInput,
} from 'react-native';
import { colors, spacing, radius, font, shadow } from '../styles/theme';

// ── Card ──────────────────────────────────────────────────────────────────────
export const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// ── Button ────────────────────────────────────────────────────────────────────
export const Button = ({ title, onPress, variant = 'primary', loading, disabled, style, icon }) => {
  const bg = {
    primary: colors.primary,
    danger:  colors.danger,
    outline: 'transparent',
    ghost:   'transparent',
  }[variant] || colors.primary;

  const textColor = (variant === 'outline' || variant === 'ghost') ? colors.primary : colors.white;
  const borderColor = variant === 'outline' ? colors.primary : 'transparent';

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bg, borderColor, borderWidth: variant === 'outline' ? 1.5 : 0 }, disabled && styles.btnDisabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <>
            {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
            <Text style={[styles.btnText, { color: textColor }]}>{title}</Text>
          </>
      }
    </TouchableOpacity>
  );
};

// ── Input ─────────────────────────────────────────────────────────────────────
export const Input = ({ label, error, style, ...props }) => (
  <View style={{ marginBottom: spacing.md }}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TextInput
      style={[styles.input, error && styles.inputError, style]}
      placeholderTextColor={colors.textLight}
      {...props}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// ── Badge / StatusChip ────────────────────────────────────────────────────────
const STAGE_COLORS = {
  farmer_onboarding:    '#6b7280',
  document_collection:  '#2563eb',
  site_visit:           '#7c3aed',
  design_boq:           '#0891b2',
  dpr_ready:            '#0891b2',
  bank_processing:      '#b45309',
  goc_registration:     '#be185d',
  m1_foundation:        '#15803d',
  m2_structure_erection:'#15803d',
  m3_covering_material: '#15803d',
  m4_trellising:        '#15803d',
  m5_drip_fitting:      '#15803d',
  m6_bed_preparation:   '#15803d',
  m7_plantation:        '#15803d',
  subsidy_claim:        '#b45309',
  agency_inspection:    '#be185d',
  committee_meeting:    '#be185d',
  subsidy_released:     '#16a34a',
  completed:            '#1a472a',
};

export const StageBadge = ({ stage }) => {
  const bg = STAGE_COLORS[stage] || colors.textMuted;
  const label = stage?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';
  return (
    <View style={[styles.badge, { backgroundColor: bg + '22', borderColor: bg }]}>
      <Text style={[styles.badgeText, { color: bg }]}>{label}</Text>
    </View>
  );
};

// ── Section Header ────────────────────────────────────────────────────────────
export const SectionHeader = ({ title, action, onAction }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ── KPI Card ──────────────────────────────────────────────────────────────────
export const KpiCard = ({ label, value, color, icon }) => (
  <View style={[styles.kpiCard, { borderLeftColor: color || colors.primary }]}>
    <Text style={[styles.kpiValue, { color: color || colors.primary }]}>{value ?? '—'}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
  </View>
);

// ── Empty State ───────────────────────────────────────────────────────────────
export const EmptyState = ({ icon, message, action, onAction }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>{icon || '📭'}</Text>
    <Text style={styles.emptyMsg}>{message || 'Nothing here yet.'}</Text>
    {action && <Button title={action} onPress={onAction} style={{ marginTop: spacing.md }} />}
  </View>
);

// ── Loading Overlay ───────────────────────────────────────────────────────────
export const LoadingScreen = ({ message }) => (
  <View style={styles.loadingScreen}>
    <ActivityIndicator color={colors.primary} size="large" />
    {message && <Text style={styles.loadingMsg}>{message}</Text>}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: font.base, fontWeight: font.semi },
  label: {
    fontSize: font.sm,
    fontWeight: font.semi,
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: font.base,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.danger },
  errorText: { fontSize: font.xs, color: colors.danger, marginTop: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: font.xs, fontWeight: font.semi },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: font.md, fontWeight: font.bold, color: colors.text },
  sectionAction: { fontSize: font.sm, color: colors.primary, fontWeight: font.semi },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    margin: spacing.xs,
    ...shadow.sm,
  },
  kpiValue: { fontSize: font.xxl, fontWeight: font.bold },
  kpiLabel: { fontSize: font.xs, color: colors.textMuted, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyMsg: { fontSize: font.base, color: colors.textMuted, textAlign: 'center' },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    gap: spacing.md,
  },
  loadingMsg: { color: colors.textMuted, fontSize: font.base, marginTop: spacing.sm },
});
