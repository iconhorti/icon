import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery }      from '../../store/api/dashboardApi';
import { OfflineBanner }         from '../../components/shared/OfflineBanner';
import { StaleBanner }           from '../../components/shared/StaleBanner';
import { StageChip }             from '../../components/shared/StageChip';
import { useCachedQuery }        from '../../hooks/useCachedQuery';
import { stageProgress, STAGE_ORDER, stageLabel } from '../../constants/stages';
import { formatDate, daysSince, formatInr }        from '../../utils/format';
import { COLORS, SPACING, RADIUS }                 from '../../constants/theme';

// Documents required at each key stage (farmer checklist)
const STAGE_DOCS: Record<string, string[]> = {
  farmer_onboarding:   ['Aadhaar Card (Front + Back)', 'PAN Card', 'Passport Photo'],
  document_collection: ['7/12 Land Record (Satbara)', 'Bank Passbook Copy', 'Affidavit of ownership'],
  bank_processing:     ['Loan Application Form', 'Income Certificate', 'Caste Certificate (if applicable)'],
  goc_registration:    ['GOC Application Form', 'Agency Registration Receipt'],
  subsidy_claim:       ['All milestone photos (M1–M7)', 'CA Certificate', 'Subsidy Claim Form'],
};

export default function FarmerHomeScreen() {
  const rawQuery = useGetStatsQuery();
  const { data: stats, isError, isStale, cacheLabel, refetch } = useCachedQuery('stats', rawQuery);
  const { isFetching } = rawQuery;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const project = stats?.my_project;

  if (!project) {
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
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>No Project Yet</Text>
          <Text style={styles.emptySub}>
            Contact your ICON dealer or office to begin your polyhouse project journey.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const pct  = stageProgress(project.project_stage);
  const days = daysSince(project.actual_start_date ?? project.created_at);

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

      {/* ── Financial summary ── */}
      <Text style={styles.sectionTitle}>FINANCIALS</Text>
      <View style={styles.finCard}>
        {[
          { label: 'Total Project Cost',  value: formatInr(project.estimated_project_cost),  color: COLORS.text },
          { label: 'Government Subsidy',  value: formatInr(project.total_subsidy_proposed),  color: '#2E7D46' },
          { label: 'Your Investment',     value: formatInr((project.estimated_project_cost ?? 0) - (project.total_subsidy_proposed ?? 0)), color: '#E65100' },
        ].map(({ label, value, color }) => (
          <View key={label} style={styles.finRow}>
            <Text style={styles.finLabel}>{label}</Text>
            <Text style={[styles.finValue, { color }]}>{value}</Text>
          </View>
        ))}
      </View>

      {/* ── Next stage info ── */}
      {(() => {
        const currIdx  = STAGE_ORDER.indexOf(project.project_stage);
        const nextSlug = currIdx >= 0 && currIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currIdx + 1] : null;
        const docs     = STAGE_DOCS[project.project_stage] ?? [];
        return (
          <>
            {nextSlug && (
              <View style={styles.nextCard}>
                <Text style={styles.nextTitle}>Next Stage</Text>
                <Text style={styles.nextStage}>{stageLabel(nextSlug)}</Text>
                <Text style={styles.nextHint}>Your project manager will advance this when the current stage is complete.</Text>
              </View>
            )}
            {docs.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>ACTION REQUIRED — DOCUMENTS</Text>
                <View style={styles.docCard}>
                  <Text style={styles.docHint}>Arrange these for the current stage:</Text>
                  {docs.map((d) => (
                    <View key={d} style={styles.docRow}>
                      <Text style={styles.docBullet}>○</Text>
                      <Text style={styles.docText}>{d}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        );
      })()}

      <View style={{ height: SPACING.xl }} />
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
  errorBanner:    { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:      { color: '#C62828', fontSize: 13, fontWeight: '600' },
  sectionTitle:   { fontSize: 11, fontWeight: '800', color: COLORS.subtext, letterSpacing: 0.6, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  finCard:        { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, elevation: 1 },
  finRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  finLabel:       { fontSize: 12, color: COLORS.subtext },
  finValue:       { fontSize: 13, fontWeight: '700' },
  nextCard:       { backgroundColor: '#E8F5E9', marginHorizontal: SPACING.md, marginTop: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#2E7D46' },
  nextTitle:      { fontSize: 10, fontWeight: '700', color: '#2E7D46', textTransform: 'uppercase', letterSpacing: 0.5 },
  nextStage:      { fontSize: 16, fontWeight: '800', color: '#1A5C2E', marginTop: 2 },
  nextHint:       { fontSize: 11, color: '#388E3C', marginTop: 4, lineHeight: 16 },
  docCard:        { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, elevation: 1 },
  docHint:        { fontSize: 11, color: COLORS.subtext, marginBottom: SPACING.sm, fontStyle: 'italic' },
  docRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingVertical: 5 },
  docBullet:      { color: COLORS.primary, fontWeight: '800', fontSize: 14, lineHeight: 18 },
  docText:        { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18 },
});
