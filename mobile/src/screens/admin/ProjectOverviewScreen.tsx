import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery } from '../../store/api/dashboardApi';
import { stageLabel }       from '../../constants/stages';
import { COLORS, SPACING }  from '../../constants/theme';

export default function ProjectOverviewScreen() {
  const { data: stats } = useGetStatsQuery();
  const sb              = stats?.stage_breakdown ?? {};
  const regionData      = stats?.admin_metrics?.region_data ?? [];

  const sortedStages = Object.entries(sb).sort((a, b) => b[1] - a[1]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
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
  section: { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  row:     { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  label:   { fontSize: 12, color: COLORS.subtext },
  count:   { fontSize: 14, fontWeight: '700', color: COLORS.text },
});
