import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery }      from '../../store/api/dashboardApi';
import { OfflineBanner }         from '../../components/shared/OfflineBanner';
import { StageChip }             from '../../components/shared/StageChip';
import { stageProgress }         from '../../constants/stages';
import { formatDate, daysSince } from '../../utils/format';
import { COLORS, SPACING }       from '../../constants/theme';

export default function FarmerHomeScreen() {
  const { data: stats } = useGetStatsQuery();
  const project         = stats?.my_project;

  if (!project) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🌱</Text>
        <Text style={styles.emptyTitle}>No Project Yet</Text>
        <Text style={styles.emptySub}>
          Contact your ICON dealer or office to begin your polyhouse project journey.
        </Text>
      </View>
    );
  }

  const pct  = stageProgress(project.project_stage);
  const days = daysSince(project.actual_start_date ?? project.created_at);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.projectName} numberOfLines={2}>
          {project.project_name ?? `Project #${project.id}`}
        </Text>
        {project.project_code ? <Text style={styles.projectCode}>{project.project_code}</Text> : null}
        <View style={{ marginTop: SPACING.sm }}>
          <StageChip stage={project.project_stage} />
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Overall Progress</Text>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Days Running', value: days !== null ? String(days) : '—', emoji: '📅' },
          { label: 'Started',      value: formatDate(project.actual_start_date ?? project.created_at), emoji: '🗓️' },
          { label: 'Location',     value: [project.village, project.district].filter(Boolean).join(', ') || '—', emoji: '📍' },
        ].map(({ label, value, emoji }) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statEmoji}>{emoji}</Text>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue} numberOfLines={2}>{value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, padding: 32 },
  emptyEmoji:     { fontSize: 48, marginBottom: 12 },
  emptyTitle:     { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  emptySub:       { fontSize: 13, color: COLORS.subtext, textAlign: 'center', lineHeight: 20 },
  header:         { backgroundColor: COLORS.primary, padding: SPACING.lg },
  projectName:    { fontSize: 18, fontWeight: '800', color: COLORS.white },
  projectCode:    { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  progressCard:   { backgroundColor: COLORS.white, margin: SPACING.md, borderRadius: 12, padding: SPACING.md, elevation: 1 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressLabel:  { fontSize: 12, color: COLORS.subtext, fontWeight: '600' },
  progressPct:    { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  progressBg:     { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden' },
  progressFill:   { height: '100%', backgroundColor: COLORS.primary, borderRadius: 5 },
  statsRow:       { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm },
  statCard:       { flex: 1, backgroundColor: COLORS.white, borderRadius: 10, padding: SPACING.md, alignItems: 'center', elevation: 1 },
  statEmoji:      { fontSize: 18, marginBottom: 4 },
  statLabel:      { fontSize: 10, color: COLORS.subtext, textAlign: 'center', marginBottom: 2 },
  statValue:      { fontSize: 12, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
});
