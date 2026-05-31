import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery } from '../../store/api/dashboardApi';
import { KpiCard }          from '../../components/shared/KpiCard';
import { OfflineBanner }    from '../../components/shared/OfflineBanner';
import { formatInr }        from '../../utils/format';
import { COLORS, SPACING }  from '../../constants/theme';

export default function DealerDashboard() {
  const { data: stats, isError, isFetching, refetch } = useGetStatsQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const dm          = stats?.dealer_metrics ?? ({} as any);
  const commission  = dm.commission   ?? { earned: 0, pending: 0, rate_pct: 0 };
  const funnel      = dm.funnel_data  ?? [];
  const leaderboard = dm.leaderboard  ?? [];

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
        <KpiCard label="My Farmers" value={stats?.total_farmers  ?? 0} accentColor={COLORS.primary} emoji="👨‍🌾" />
        <KpiCard label="Projects"   value={stats?.total_projects  ?? 0} accentColor="#1565C0"        emoji="🏗️" />
        <KpiCard label="Completed"  value={stats?.completed       ?? 0} accentColor="#2E7D46"        emoji="✅" />
      </View>

      {/* Commission card */}
      <View style={styles.commCard}>
        <Text style={styles.commLabel}>Commission Earned</Text>
        <Text style={styles.commValue}>{formatInr(commission.earned)}</Text>
        <View style={styles.commRow}>
          <Text style={styles.commSub}>Pending: {formatInr(commission.pending)}</Text>
          <Text style={styles.commSub}>Rate: {commission.rate_pct}%</Text>
        </View>
      </View>

      {funnel.length > 0 && (
        <>
          <Text style={styles.section}>PIPELINE FUNNEL</Text>
          {funnel.map((f: any) => (
            <View key={f.name} style={styles.funnelRow}>
              <Text style={styles.funnelLabel}>{f.name}</Text>
              <Text style={[styles.funnelVal, { color: f.fill }]}>{f.value}</Text>
            </View>
          ))}
        </>
      )}

      {leaderboard.length > 0 && (
        <>
          <Text style={styles.section}>LEADERBOARD</Text>
          {leaderboard.map((d: any) => (
            <View key={d.name} style={[styles.lbRow, d.isMe && styles.lbMe]}>
              <Text style={[styles.lbName, d.isMe && { color: COLORS.primary, fontWeight: '800' }]}>{d.name}</Text>
              <Text style={styles.lbCount}>{d.projects} projects</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row:         { flexDirection: 'row', padding: SPACING.md, gap: 6 },
  commCard:    { backgroundColor: COLORS.primary, margin: SPACING.md, borderRadius: 14, padding: SPACING.lg },
  commLabel:   { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  commValue:   { color: '#fff', fontSize: 26, fontWeight: '800', marginVertical: 4 },
  commRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  commSub:     { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  section:     { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  funnelRow:   { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  funnelLabel: { fontSize: 12, color: COLORS.subtext },
  funnelVal:   { fontSize: 16, fontWeight: '800' },
  lbRow:       { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  lbMe:        { borderWidth: 2, borderColor: COLORS.primary },
  lbName:      { fontSize: 13, color: COLORS.text },
  lbCount:     { fontSize: 12, color: COLORS.subtext },
  errorBanner: { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:   { color: '#C62828', fontSize: 13, fontWeight: '600' },
});
