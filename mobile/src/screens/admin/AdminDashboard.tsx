import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import { useGetStatsQuery }  from '../../store/api/dashboardApi';
import { OfflineBanner }     from '../../components/shared/OfflineBanner';
import { StaleBanner }       from '../../components/shared/StaleBanner';
import { useCachedQuery }    from '../../hooks/useCachedQuery';
import { formatInr }         from '../../utils/format';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

// ── Stage groups ──────────────────────────────────────────────────────────────
const PIPELINE_GROUPS = [
  {
    label:  'Onboarding / Planning',
    emoji:  '📋',
    color:  '#6366f1',
    bg:     '#EEF2FF',
    stages: ['draft', 'farmer_onboarding', 'document_collection', 'site_visit', 'design_boq', 'dpr_ready'],
  },
  {
    label:  'Bank Processing',
    emoji:  '🏦',
    color:  '#1565C0',
    bg:     '#E3F2FD',
    stages: ['bank_processing'],
  },
  {
    label:  'GOC Registration',
    emoji:  '📜',
    color:  '#f59e0b',
    bg:     '#FFFBEB',
    stages: ['goc_registration'],
  },
  {
    label:  'Under Construction',
    emoji:  '🏗️',
    color:  '#ea580c',
    bg:     '#FFF7ED',
    stages: ['m1_foundation', 'm2_structure_erection', 'm3_covering_material',
             'm4_trellising', 'm5_drip_fitting', 'm6_bed_preparation', 'm7_plantation'],
  },
  {
    label:  'Subsidy Processing',
    emoji:  '💸',
    color:  '#0ea5e9',
    bg:     '#E0F2FE',
    stages: ['subsidy_claim', 'agency_inspection', 'committee_meeting'],
  },
  {
    label:  'Released / Completed',
    emoji:  '✅',
    color:  '#22c55e',
    bg:     '#F0FDF4',
    stages: ['subsidy_released', 'completed'],
  },
];

interface Props { navigation: NavigationProp<any>; }

export default function AdminDashboard({ navigation }: Props) {
  const rawQuery = useGetStatsQuery();
  const { data: stats, isError, isStale, cacheLabel, refetch } = useCachedQuery('stats', rawQuery);
  const { isFetching } = rawQuery;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const sb   = stats?.stage_breakdown   ?? {};
  const kpis = stats?.admin_metrics?.kpis ?? {};

  const sumStages = (stages: string[]) =>
    stages.reduce((total, s) => total + (sb[s] ?? 0), 0);

  const openList = (stages: string[], title: string) => {
    navigation.navigate('PipelineList', { stages, title });
  };

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
        <View style={styles.errBox}>
          <Text style={styles.errTxt}>Could not load data. Pull down to retry.</Text>
        </View>
      )}

      {/* ── Top 3 summary KPIs ── */}
      <View style={styles.topRow}>
        <View style={[styles.topCard, { borderTopColor: '#C8972A' }]}>
          <Text style={styles.topEmoji}>🏗️</Text>
          <Text style={styles.topVal}>{stats?.total_projects ?? 0}</Text>
          <Text style={styles.topLbl}>Total Projects</Text>
        </View>
        <View style={[styles.topCard, { borderTopColor: '#2E7D46' }]}>
          <Text style={styles.topEmoji}>👨‍🌾</Text>
          <Text style={[styles.topVal, { color: '#2E7D46' }]}>{stats?.total_farmers ?? 0}</Text>
          <Text style={styles.topLbl}>Farmers</Text>
        </View>
        <View style={[styles.topCard, { borderTopColor: '#22c55e' }]}>
          <Text style={styles.topEmoji}>✅</Text>
          <Text style={[styles.topVal, { color: '#22c55e' }]}>{stats?.completed ?? 0}</Text>
          <Text style={styles.topLbl}>Completed</Text>
        </View>
      </View>

      {/* ── Financial card ── */}
      <View style={styles.finCard}>
        <Text style={styles.finTitle}>Total Subsidy Portfolio</Text>
        <Text style={styles.finBig}>{formatInr(stats?.total_subsidy_proposed)}</Text>
        <View style={styles.finGrid}>
          {[
            { label: 'Eligible Cost',    value: formatInr(stats?.total_eligible_cost),    color: '#93c5fd' },
            { label: 'Proposed',         value: formatInr(stats?.total_subsidy_proposed), color: '#fbbf24' },
            { label: 'Received',         value: formatInr(stats?.total_subsidy_received), color: '#34d399' },
            { label: 'Pending Claims',   value: stats?.pending_subsidy ?? 0,              color: '#f87171' },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.finCell}>
              <Text style={styles.finLbl}>{label}</Text>
              <Text style={[styles.finVal, { color }]}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Pipeline breakdown (tappable) ── */}
      <Text style={styles.sectionTitle}>PIPELINE — TAP TO VIEW CASES</Text>

      {PIPELINE_GROUPS.map((group) => {
        const count = sumStages(group.stages);
        return (
          <TouchableOpacity
            key={group.label}
            style={[styles.pipelineCard, { backgroundColor: group.bg, borderLeftColor: group.color }]}
            onPress={() => openList(group.stages, group.label)}
            activeOpacity={0.75}
          >
            <View style={styles.pipelineLeft}>
              <Text style={styles.pipelineEmoji}>{group.emoji}</Text>
              <View>
                <Text style={[styles.pipelineLabel, { color: group.color }]}>{group.label}</Text>
                <Text style={styles.pipelineSub}>
                  {group.stages.length > 1
                    ? group.stages.filter(s => (sb[s] ?? 0) > 0).map(s => `${s.replace(/_/g, ' ')}: ${sb[s] ?? 0}`).join(' · ') || 'No projects'
                    : ''}
                </Text>
              </View>
            </View>
            <View style={styles.pipelineRight}>
              <Text style={[styles.pipelineCount, { color: group.color }]}>{count}</Text>
              <Text style={styles.pipelineArrow}>›</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* ── Bank / GOC detailed KPIs ── */}
      {(kpis.bank_wip != null) && (
        <>
          <Text style={styles.sectionTitle}>BANK & GOC DETAILS</Text>
          <View style={styles.detailGrid}>
            {[
              { label: 'Bank WIP',        value: kpis.bank_wip       ?? 0, color: '#1565C0' },
              { label: 'Bank Sanctioned', value: kpis.bank_sanctioned ?? 0, color: '#2E7D46' },
              { label: 'GOC Applied',     value: kpis.goc_applied    ?? 0, color: '#f59e0b' },
              { label: 'GOC Approved',    value: kpis.goc_approved   ?? 0, color: '#22c55e' },
            ].map(({ label, value, color }) => (
              <View key={label} style={styles.detailCard}>
                <Text style={[styles.detailVal, { color }]}>{value}</Text>
                <Text style={styles.detailLbl}>{label}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Team roster ── */}
      <Text style={styles.sectionTitle}>TEAM</Text>
      {Object.entries(stats?.role_counts ?? {}).map(([role, count]) => (
        <View key={role} style={styles.teamRow}>
          <Text style={styles.teamLabel}>
            {role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
          <Text style={styles.teamCount}>{count as number}</Text>
        </View>
      ))}

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  errBox:         { backgroundColor: '#FFEBEE', margin: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errTxt:         { color: '#C62828', fontSize: 13, fontWeight: '600' },

  // Top 3 summary
  topRow:         { flexDirection: 'row', padding: SPACING.md, gap: 8 },
  topCard:        { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, borderTopWidth: 3, elevation: 1, alignItems: 'center' },
  topEmoji:       { fontSize: 20, marginBottom: 4 },
  topVal:         { fontSize: 22, fontWeight: '800', color: '#C8972A' },
  topLbl:         { fontSize: 10, color: COLORS.subtext, textAlign: 'center', marginTop: 2, fontWeight: '600' },

  // Financial
  finCard:        { backgroundColor: '#1A5C2E', marginHorizontal: SPACING.md, marginBottom: SPACING.md, borderRadius: 14, padding: SPACING.lg },
  finTitle:       { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 },
  finBig:         { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: SPACING.sm },
  finGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  finCell:        { width: '50%', paddingVertical: 6 },
  finLbl:         { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' },
  finVal:         { fontSize: 14, fontWeight: '700', marginTop: 2 },

  // Pipeline
  sectionTitle:   { fontSize: 11, fontWeight: '800', color: COLORS.subtext, letterSpacing: 0.6, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  pipelineCard:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: SPACING.md, marginBottom: 8, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 4, elevation: 1 },
  pipelineLeft:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  pipelineEmoji:  { fontSize: 22 },
  pipelineLabel:  { fontSize: 14, fontWeight: '700' },
  pipelineSub:    { fontSize: 10, color: COLORS.subtext, marginTop: 2, flexShrink: 1 },
  pipelineRight:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pipelineCount:  { fontSize: 24, fontWeight: '900' },
  pipelineArrow:  { fontSize: 22, color: COLORS.subtext, fontWeight: '300' },

  // Bank/GOC detail grid
  detailGrid:     { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, gap: 8, marginBottom: SPACING.sm },
  detailCard:     { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, flex: 1, minWidth: '45%', elevation: 1, alignItems: 'center' },
  detailVal:      { fontSize: 22, fontWeight: '800' },
  detailLbl:      { fontSize: 10, color: COLORS.subtext, marginTop: 2, textAlign: 'center', fontWeight: '600' },

  // Team
  teamRow:        { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  teamLabel:      { fontSize: 12, color: COLORS.subtext, textTransform: 'capitalize' },
  teamCount:      { fontSize: 15, fontWeight: '800', color: COLORS.primary },
});
