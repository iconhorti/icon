import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, RefreshControl, StyleSheet } from 'react-native';
import { useGetFarmsQuery }         from '../../store/api/agronomistApi';
import { KpiCard }                  from '../../components/shared/KpiCard';
import { OfflineBanner }            from '../../components/shared/OfflineBanner';
import { COLORS, SPACING, RADIUS }  from '../../constants/theme';

const PURPLE = '#6A1B9A';

export default function AgronomistDashboard() {
  const { data: farms = [], isError, isFetching, refetch } = useGetFarmsQuery();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const critical = farms.filter(f => f.alert_level === 'critical').length;
  const warning  = farms.filter(f => f.alert_level === 'warning').length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}
      refreshControl={<RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} colors={[PURPLE]} tintColor={PURPLE} />}
    >
      <OfflineBanner />
      {isError && <View style={styles.error}><Text style={styles.errorTxt}>Could not load farm data. Pull to retry.</Text></View>}
      <View style={styles.kpiRow}>
        <KpiCard label="Assigned Farms"  value={farms.length} accentColor={PURPLE}   emoji="🌾" />
        <KpiCard label="Critical Alerts" value={critical}     accentColor="#C62828"  emoji="🚨" />
        <KpiCard label="Visits Due"      value={warning}      accentColor="#E65100"  emoji="🚗" />
      </View>
      <Text style={styles.section}>FARM ALERTS</Text>
      {farms.filter(f => f.alert_level !== 'none').map(f => (
        <View key={f.id} style={[styles.alertRow, f.alert_level === 'critical' && styles.alertCrit]}>
          <Text style={{ fontSize: 20 }}>{f.alert_level === 'critical' ? '🚨' : '⚠️'}</Text>
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={styles.alertName}>{f.farmer_name} — {f.village}</Text>
            <Text style={styles.alertSub}>{f.crop_type} · {f.dap} DAP</Text>
          </View>
        </View>
      ))}
      {critical === 0 && warning === 0 && <Text style={styles.allClear}>All farms within normal parameters</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  error:     { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorTxt:  { color: '#C62828', fontSize: 13, fontWeight: '600' },
  kpiRow:    { flexDirection: 'row', padding: SPACING.md, gap: 6 },
  section:   { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  alertRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1, borderLeftWidth: 3, borderLeftColor: '#E65100' },
  alertCrit: { borderLeftColor: '#C62828', backgroundColor: '#FFF8F8' },
  alertName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  alertSub:  { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  allClear:  { textAlign: 'center', color: COLORS.primary, fontWeight: '700', padding: 24, fontSize: 14 },
});
