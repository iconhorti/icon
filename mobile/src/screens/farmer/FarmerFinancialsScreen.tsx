import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery } from '../../store/api/dashboardApi';
import { formatInr }        from '../../utils/format';
import { COLORS, SPACING }  from '../../constants/theme';

export default function FarmerFinancialsScreen() {
  const { data: stats } = useGetStatsQuery();
  const p               = stats?.my_project;

  if (!p) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}>
        <Text style={{ color: COLORS.subtext }}>No project data available.</Text>
      </View>
    );
  }

  const cost    = p.estimated_project_cost ?? 0;
  const subsidy = p.total_subsidy_proposed ?? cost * 0.5;
  const yours   = cost - subsidy;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md }}>
      {[
        { label: 'Total Project Cost', value: formatInr(cost),    bg: '#F5F5F5', color: COLORS.text  },
        { label: 'Government Subsidy', value: formatInr(subsidy), bg: '#E8F5E9', color: '#2E7D46'    },
        { label: 'Your Investment',    value: formatInr(yours),   bg: '#FFF3E0', color: '#E65100'    },
      ].map(({ label, value, bg, color }) => (
        <View key={label} style={[styles.card, { backgroundColor: bg }]}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={[styles.cardValue, { color }]}>{value}</Text>
        </View>
      ))}
      <View style={styles.note}>
        <Text style={styles.noteTxt}>
          💡 Subsidy is released after agency inspection and committee approval.
          Contact your ICON project manager for status updates.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card:      { borderRadius: 12, padding: SPACING.lg, marginBottom: SPACING.md, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  cardLabel: { fontSize: 12, color: COLORS.subtext, fontWeight: '600', marginBottom: 4 },
  cardValue: { fontSize: 26, fontWeight: '800' },
  note:      { backgroundColor: '#E3F2FD', borderRadius: 10, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#1565C0' },
  noteTxt:   { fontSize: 12, color: '#1565C0', fontWeight: '500', lineHeight: 18 },
});
