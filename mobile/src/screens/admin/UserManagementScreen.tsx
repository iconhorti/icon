import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery } from '../../store/api/dashboardApi';
import { OfflineBanner }    from '../../components/shared/OfflineBanner';
import { COLORS, SPACING }  from '../../constants/theme';

export default function UserManagementScreen() {
  const { data: stats, isError, isFetching, refetch } = useGetStatsQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const rc = stats?.role_counts ?? {};

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
      <Text style={styles.section}>STAFF BY ROLE</Text>
      {Object.entries(rc).map(([role, count]) => (
        <View key={role} style={styles.row}>
          <Text style={styles.name}>{role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Text>
          <Text style={styles.count}>{count as number} active</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section:     { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  name:        { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  count:       { fontSize: 12, color: COLORS.subtext },
  errorBanner: { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:   { color: '#C62828', fontSize: 13, fontWeight: '600' },
});
