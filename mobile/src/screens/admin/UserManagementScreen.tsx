import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery } from '../../store/api/dashboardApi';
import { OfflineBanner }    from '../../components/shared/OfflineBanner';
import { COLORS, SPACING }  from '../../constants/theme';

export default function UserManagementScreen() {
  const { data: stats } = useGetStatsQuery();
  const rc = stats?.role_counts ?? {};

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
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
  section: { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  name:    { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  count:   { fontSize: 12, color: COLORS.subtext },
});
