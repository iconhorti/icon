import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery } from '../../store/api/dashboardApi';
import { KpiCard }          from '../../components/shared/KpiCard';
import { OfflineBanner }    from '../../components/shared/OfflineBanner';
import { COLORS, SPACING }  from '../../constants/theme';

export default function LoanDashboard() {
  const { data: stats } = useGetStatsQuery();
  const kpis = stats?.admin_metrics?.kpis ?? {};

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      <View style={styles.row}>
        <KpiCard label="Bank WIP"    value={kpis.bank_wip        ?? 0} accentColor="#1565C0" emoji="🏦" />
        <KpiCard label="Sanctioned"  value={kpis.bank_sanctioned ?? 0} accentColor="#2E7D46" emoji="✅" />
        <KpiCard label="GOC Applied" value={kpis.goc_applied     ?? 0} accentColor="#E65100" emoji="📋" />
      </View>
      <Text style={styles.section}>PIPELINE SUMMARY</Text>
      <View style={styles.card}>
        {[
          { label: 'Total Projects',    value: stats?.total_projects  ?? 0 },
          { label: 'Bank + GOC Active', value: (kpis.bank_wip ?? 0) + (kpis.goc_applied ?? 0) },
          { label: 'Subsidy Pending',   value: stats?.pending_subsidy ?? 0 },
          { label: 'Completed',         value: stats?.completed       ?? 0 },
        ].map(({ label, value }) => (
          <View key={label} style={styles.cardRow}>
            <Text style={styles.cardLabel}>{label}</Text>
            <Text style={styles.cardValue}>{value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', padding: SPACING.md, gap: 6 },
  section:   { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  card:      { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, borderRadius: 12, padding: SPACING.md, elevation: 1 },
  cardRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  cardLabel: { fontSize: 12, color: COLORS.subtext },
  cardValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
});
