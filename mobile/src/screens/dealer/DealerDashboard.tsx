import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation }    from '@react-navigation/native';
import { useGetStatsQuery } from '../../store/api/dashboardApi';
import { OfflineBanner }    from '../../components/shared/OfflineBanner';
import { formatInr }        from '../../utils/format';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const DEALER_STAGES = [
  { label: 'Onboarding',       emoji: '📋', color: '#6366f1', bg: '#EEF2FF',
    stages: ['draft', 'farmer_onboarding', 'document_collection'] },
  { label: 'Design / DPR',     emoji: '📐', color: '#0ea5e9', bg: '#E0F2FE',
    stages: ['site_visit', 'design_boq', 'dpr_ready'] },
  { label: 'Bank Processing',  emoji: '🏦', color: '#1565C0', bg: '#E3F2FD',
    stages: ['bank_processing'] },
  { label: 'GOC Registration', emoji: '📜', color: '#f59e0b', bg: '#FFFBEB',
    stages: ['goc_registration'] },
  { label: 'Construction',     emoji: '🏗️', color: '#ea580c', bg: '#FFF7ED',
    stages: ['m1_foundation','m2_structure_erection','m3_covering_material',
             'm4_trellising','m5_drip_fitting','m6_bed_preparation','m7_plantation'] },
  { label: 'Subsidy Processing',emoji: '💸', color: '#0ea5e9', bg: '#E0F2FE',
    stages: ['subsidy_claim', 'agency_inspection', 'committee_meeting'] },
  { label: 'Completed',        emoji: '✅', color: '#22c55e', bg: '#F0FDF4',
    stages: ['subsidy_released', 'completed'] },
];

export default function DealerDashboard() {
  const navigation = useNavigation<any>();
  const { data: stats, isError, isFetching, refetch } = useGetStatsQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const dm          = stats?.dealer_metrics   ?? ({} as any);
  const commission  = dm.commission            ?? { earned: 0, pending: 0, rate_pct: 0 };
  const leaderboard = dm.leaderboard           ?? [];
  const sb          = stats?.stage_breakdown   ?? {};

  const sumStages = (stages: string[]) =>
    stages.reduce((n, s) => n + (sb[s] ?? 0), 0);

  const goToFarmers = () => navigation.navigate('Farmers', { screen: 'FarmerList' });

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
        <View style={styles.errBox}>
          <Text style={styles.errTxt}>Could not load data. Pull down to retry.</Text>
        </View>
      )}

      {/* ── Summary row ── */}
      <View style={styles.topRow}>
        <View style={styles.topCard}>
          <Text style={styles.topEmoji}>👨‍🌾</Text>
          <Text style={styles.topVal}>{stats?.total_farmers ?? 0}</Text>
          <Text style={styles.topLbl}>My Farmers</Text>
        </View>
        <View style={styles.topCard}>
          <Text style={styles.topEmoji}>🏗️</Text>
          <Text style={[styles.topVal, { color: '#1565C0' }]}>{stats?.total_projects ?? 0}</Text>
          <Text style={styles.topLbl}>Projects</Text>
        </View>
        <View style={styles.topCard}>
          <Text style={styles.topEmoji}>✅</Text>
          <Text style={[styles.topVal, { color: '#22c55e' }]}>{stats?.completed ?? 0}</Text>
          <Text style={styles.topLbl}>Completed</Text>
        </View>
      </View>

      {/* ── Commission card ── */}
      <View style={styles.commCard}>
        <Text style={styles.commTitle}>My Commission</Text>
        <Text style={styles.commBig}>{formatInr(commission.earned)}</Text>
        <View style={styles.commRow}>
          <View>
            <Text style={styles.commLbl}>Pending</Text>
            <Text style={[styles.commVal, { color: '#fbbf24' }]}>{formatInr(commission.pending)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.commLbl}>Commission Rate</Text>
            <Text style={[styles.commVal, { color: '#34d399' }]}>{commission.rate_pct}% of project cost</Text>
          </View>
        </View>
        <View style={styles.commSubsidy}>
          <Text style={styles.commSubsidyLbl}>Subsidy Portfolio</Text>
          <Text style={styles.commSubsidyVal}>{formatInr(stats?.total_subsidy_proposed)}</Text>
        </View>
      </View>

      {/* ── Pipeline breakdown — tappable ── */}
      <Text style={styles.section}>MY FARMER PIPELINE — TAP TO VIEW</Text>
      {DEALER_STAGES.map((group) => {
        const count = sumStages(group.stages);
        return (
          <TouchableOpacity
            key={group.label}
            style={[styles.pipeCard, { backgroundColor: group.bg, borderLeftColor: group.color }]}
            onPress={goToFarmers}
            activeOpacity={0.75}
          >
            <Text style={styles.pipeEmoji}>{group.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pipeLabel, { color: group.color }]}>{group.label}</Text>
              {group.stages.length > 1 && count > 0 && (
                <Text style={styles.pipeSub} numberOfLines={1}>
                  {group.stages.filter(s => (sb[s] ?? 0) > 0).map(s => `${s.replace(/_/g,'·')}: ${sb[s]}`).join('  ')}
                </Text>
              )}
            </View>
            <Text style={[styles.pipeCount, { color: group.color }]}>{count}</Text>
            <Text style={styles.pipeArrow}>›</Text>
          </TouchableOpacity>
        );
      })}

      {/* ── Leaderboard ── */}
      {leaderboard.length > 0 && (
        <>
          <Text style={styles.section}>DEALER LEADERBOARD</Text>
          {leaderboard.map((d: any, idx: number) => (
            <View key={d.name} style={[styles.lbRow, d.isMe && styles.lbMe]}>
              <Text style={styles.lbRank}>#{idx + 1}</Text>
              <Text style={[styles.lbName, d.isMe && { color: COLORS.primary, fontWeight: '800' }]}>
                {d.name}{d.isMe ? ' (You)' : ''}
              </Text>
              <Text style={styles.lbCount}>{d.projects} projects</Text>
            </View>
          ))}
        </>
      )}

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  errBox:         { backgroundColor: '#FFEBEE', margin: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errTxt:         { color: '#C62828', fontSize: 13, fontWeight: '600' },
  topRow:         { flexDirection: 'row', padding: SPACING.md, gap: 8 },
  topCard:        { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, elevation: 1, alignItems: 'center' },
  topEmoji:       { fontSize: 20, marginBottom: 4 },
  topVal:         { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  topLbl:         { fontSize: 10, color: COLORS.subtext, marginTop: 2, textAlign: 'center', fontWeight: '600' },
  commCard:       { backgroundColor: COLORS.primary, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: 14, padding: SPACING.lg },
  commTitle:      { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 },
  commBig:        { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: SPACING.sm },
  commRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  commLbl:        { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  commVal:        { fontSize: 14, fontWeight: '700' },
  commSubsidy:    { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: SPACING.sm, flexDirection: 'row', justifyContent: 'space-between' },
  commSubsidyLbl: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  commSubsidyVal: { color: '#fbbf24', fontSize: 14, fontWeight: '700' },
  section:        { fontSize: 11, fontWeight: '800', color: COLORS.subtext, letterSpacing: 0.6, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  pipeCard:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.md, marginBottom: 8, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 4, elevation: 1 },
  pipeEmoji:      { fontSize: 22, marginRight: SPACING.sm },
  pipeLabel:      { fontSize: 14, fontWeight: '700' },
  pipeSub:        { fontSize: 10, color: COLORS.subtext, marginTop: 2 },
  pipeCount:      { fontSize: 24, fontWeight: '900', marginRight: 4 },
  pipeArrow:      { fontSize: 22, color: COLORS.subtext },
  lbRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1, gap: SPACING.sm },
  lbMe:           { borderWidth: 2, borderColor: COLORS.primary },
  lbRank:         { fontSize: 14, fontWeight: '800', color: COLORS.subtext, width: 24 },
  lbName:         { flex: 1, fontSize: 13, color: COLORS.text },
  lbCount:        { fontSize: 12, color: COLORS.subtext },
});
