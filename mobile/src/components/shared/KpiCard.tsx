import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export type KpiSeverity = 'ok' | 'warn' | 'breach';

interface KpiCardProps {
  label:        string;
  value:        string | number;
  sub?:         string;
  accentColor?: string;
  emoji?:       string;
  /** Optional numeric target — shows progress bar when value is numeric. */
  target?:      number;
  /** Decision severity border. */
  severity?:    KpiSeverity;
  alert?:       boolean;
  onPress?:     () => void;
  style?:       StyleProp<ViewStyle>;
}

const SEVERITY_BORDER: Record<KpiSeverity, string> = {
  ok:     'transparent',
  warn:   '#F59E0B',
  breach: '#EF4444',
};

/**
 * Shared KPI card — props only. Supports target, severity, and tap-through.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  sub,
  accentColor = COLORS.primary,
  emoji,
  target,
  severity,
  alert,
  onPress,
  style,
}) => {
  const numericValue =
    typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  const progress =
    target != null && target > 0 && Number.isFinite(numericValue)
      ? Math.min(100, Math.max(0, (numericValue / target) * 100))
      : null;

  const resolved: KpiSeverity | undefined =
    severity ?? (alert ? 'breach' : undefined);

  const body = (
    <View
      style={[
        styles.card,
        { borderTopColor: accentColor },
        resolved && resolved !== 'ok'
          ? { borderLeftWidth: 3, borderLeftColor: SEVERITY_BORDER[resolved] }
          : null,
        (alert || resolved === 'breach') ? styles.alertCard : null,
        style,
      ]}
    >
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {progress != null && (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress}%`, backgroundColor: accentColor }]} />
        </View>
      )}
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      {target != null && progress != null && (
        <Text style={styles.sub}>Target {target} · {Math.round(progress)}%</Text>
      )}
      {onPress ? (
        <Text style={[styles.tap, { color: accentColor }]}>Tap to view ›</Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={{ flex: 1 }} onPress={onPress} activeOpacity={0.75}>
        {body}
      </TouchableOpacity>
    );
  }
  return body;
};

const styles = StyleSheet.create({
  card:  {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    borderTopWidth:  3,
    margin:          SPACING.xs,
    elevation:       1,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.08,
    shadowRadius:    2,
  },
  alertCard: {
    backgroundColor: '#FFF8F8',
    borderColor: 'rgba(239,68,68,0.2)',
  },
  emoji: { fontSize: 18, marginBottom: SPACING.xs },
  label: {
    fontSize:      10,
    fontWeight:    '700',
    color:         COLORS.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  4,
  },
  value: { fontSize: 22, fontWeight: '800' },
  sub:   { fontSize: 10, color: COLORS.subtext, marginTop: 2 },
  tap:   { fontSize: 10, fontWeight: '700', marginTop: 6 },
  track: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
  },
  fill:  { height: '100%', borderRadius: 999, minWidth: 2 },
});
