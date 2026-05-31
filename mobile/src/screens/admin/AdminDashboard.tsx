import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery } from '../../store/api/dashboardApi';
import { KpiCard }          from '../../components/shared/KpiCard';
import { OfflineBanner }    from '../../components/shared/OfflineBanner';
import { StaleBanner }      from '../../components/shared/StaleBanner';
import { useCachedQuery }   from '../../hooks/useCachedQuery';
import { formatInr }        from '../../utils/format';
import { COLORS, SPACING }  from '../../constants/theme';

export default function AdminDashboard() {
  const rawQuery = useGetStatsQuery();
  const { data: stats, isError, isStale, cacheLabel, refetch } = useCachedQuery('stats', rawQuery);
  const { isFetching } = rawQuery;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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
      <StaleBanner label={cacheLabel} />
      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ Could not load data. Pull down to retry.</Text>
        </View>
      )}
      <View style={styles.row}>
        <KpiCard label="Projects"  value={stats?.total_projects ?? 0} accentColor="#C8972A" emoji="🏗️" />
        <KpiCard label="Farmers"   value={stats?.total_farmers  ?? 0} accentColor="#2E7D46" emoji="👨‍🌾" />
        <KpiCard label="Completed" value={stats?.completed      ?? 0} accentColor="#1565C0" emoji="✅" />
      </View>

      {/* Financial dark card */}
      <View style={styles.finCard}>
        <Text style={styles.finLabel}>Total Subsidy Portfolio</Text>
        <Text style={styles.finValue}>{formatInr(stats?.total_subsidy_proposed)}</Text>
        <View style={styles.finRow}>
          <Text style={styles.finSub}>Proposed</Text>
          <Text style={[styles.finSub, { color: '#fbbf24' }]}>{formatInr(stats?.total_subsidy_proposed)}</Text>
        </View>
        <View style={styles.finRow}>
          <Text style={styles.finSub}>Received</Text>
          <Text style={[styles.finSub, { color: '#34d399' }]}>{formatInr(stats?.total_subsidy_received)}</Text>
        </View>
      </View>

      {/* Team roster */}
      <Text style={styles.section}>TEAM</Text>
      {Object.entries(stats?.role_counts ?? {}).map(([role, count]) => (
        <View key={role} style={styles.teamRow}>
          <Text style={styles.teamLabel}>{role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Text>
          <Text style={styles.teamCount}>{count as number}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row:         { flexDirection: 'row', padding: SPACING.md, gap: 6 },
  finCard:     { backgroundColor: '#1A5C2E', margin: SPACING.md, borderRadius: 14, padding: SPACING.lg },
  finLabel:    { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 },
  finValue:    { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: SPACING.sm },
  finRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  finSub:      { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  section:     { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  teamRow:     { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  teamLabel:   { fontSize: 12, color: COLORS.subtext, textTransform: 'capitalize' },
  teamCount:   { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  errorBanner: { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:   { color: '#C62828', fontSize: 13, fontWeight: '600' },
});
