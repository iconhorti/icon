import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery } from '../../store/api/dashboardApi';
import { KpiCard }          from '../../components/shared/KpiCard';
import { OfflineBanner }    from '../../components/shared/OfflineBanner';
import { COLORS, SPACING }  from '../../constants/theme';

export default function LoanDashboard() {
  const { data: stats, isError, isFetching, refetch } = useGetStatsQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const kpis = stats?.admin_metrics?.kpis ?? {};

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || isFetching}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      <OfflineBanner />
      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ Could not load data. Pull down to retry.</Text>
        </View>
      )}
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
  row:         { flexDirection: 'row', padding: SPACING.md, gap: 6 },
  section:     { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  card:        { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, borderRadius: 12, padding: SPACING.md, elevation: 1 },
  cardRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  cardLabel:   { fontSize: 12, color: COLORS.subtext },
  cardValue:   { fontSize: 13, fontWeight: '700', color: COLORS.text },
  errorBanner: { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:   { color: '#C62828', fontSize: 13, fontWeight: '600' },
});
