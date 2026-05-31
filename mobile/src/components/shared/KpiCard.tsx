import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface KpiCardProps {
  label:        string;
  value:        string | number;
  sub?:         string;
  accentColor?: string;
  emoji?:       string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label, value, sub, accentColor = COLORS.primary, emoji,
}) => (
  <View style={[styles.card, { borderTopColor: accentColor }]}>
    {emoji && <Text style={styles.emoji}>{emoji}</Text>}
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
    {sub ? <Text style={styles.sub}>{sub}</Text> : null}
  </View>
);

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
});
