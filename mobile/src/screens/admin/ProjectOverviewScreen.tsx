import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery } from '../../store/api/dashboardApi';
import { stageLabel }       from '../../constants/stages';
import { COLORS, SPACING }  from '../../constants/theme';

export default function ProjectOverviewScreen() {
  const { data: stats, isError, isFetching, refetch } = useGetStatsQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const sb         = stats?.stage_breakdown ?? {};
  const regionData = stats?.admin_metrics?.region_data ?? [];

  const sortedStages = Object.entries(sb).sort((a, b) => b[1] - a[1]);

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
      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ Could not load data. Pull down to retry.</Text>
        </View>
      )}
      <Text style={styles.section}>STAGE BREAKDOWN</Text>
      {sortedStages.map(([slug, count]) => (
        <View key={slug} style={styles.row}>
          <Text style={styles.label}>{stageLabel(slug)}</Text>
          <Text style={styles.count}>{count}</Text>
        </View>
      ))}
      {regionData.length > 0 && (
        <>
          <Text style={styles.section}>DISTRICT DISTRIBUTION</Text>
          {regionData.map(({ name, count }) => (
            <View key={name} style={styles.row}>
              <Text style={styles.label}>{name}</Text>
              <Text style={styles.count}>{count}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section:     { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  row:         { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  label:       { fontSize: 12, color: COLORS.subtext },
  count:       { fontSize: 14, fontWeight: '700', color: COLORS.text },
  errorBanner: { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:   { color: '#C62828', fontSize: 13, fontWeight: '600' },
});
