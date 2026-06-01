import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation }    from '@react-navigation/native';
import { useGetStatsQuery } from '../../store/api/dashboardApi';
import { OfflineBanner }    from '../../components/shared/OfflineBanner';
import { formatInr }        from '../../utils/format';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

// Tappable KPI card
function TapKpi({ label, value, sub, color, emoji, onPress }: {
  label: string; value: number | string; sub?: string;
  color: string; emoji: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.kpi, { borderTopColor: color }]} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.kpiEmoji}>{emoji}</Text>
      <Text style={[styles.kpiVal, { color }]}>{value}</Text>
      <Text style={styles.kpiLbl}>{label}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
      <Text style={[styles.kpiTap, { color }]}>Tap to view ›</Text>
    </TouchableOpacity>
  );
}

export default function LoanDashboard() {
  const navigation = useNavigation<any>();
  const { data: stats, isError, isFetching, refetch } = useGetStatsQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const kpis = stats?.admin_metrics?.kpis     ?? {};
  const sb   = stats?.stage_breakdown          ?? {};

  // Loan portfolio = sum of loan amounts — approximated from total_eligible_cost
  const totalEligible = stats?.total_eligible_cost ?? 0;

  // Stage counts for bank-related stages
  const bankWip        = kpis.bank_wip        ?? sb['bank_processing']   ?? 0;
  const bankSanctioned = kpis.bank_sanctioned ?? 0;
  const gocApplied     = kpis.goc_applied     ?? sb['goc_registration']  ?? 0;
  const gocApproved    = kpis.goc_approved    ?? 0;
  const subsidyCount   = stats?.pending_subsidy ?? 0;

  // Navigate to the Cases tab (already has the pipeline list)
  const goToCases = (initialStage?: string) => {
    navigation.navigate('Cases', {
      screen: 'Pipeline',
      params: initialStage ? { initialStage } : undefined,
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || isFetching}
          onRefresh={onRefresh}
          colors={['#1565C0']}
          tintColor="#1565C0"
        />
      }
    >
      <OfflineBanner />
      {isError && (
        <View style={styles.errBox}>
          <Text style={styles.errTxt}>Could not load data. Pull down to retry.</Text>
        </View>
      )}

      {/* ── Portfolio summary card ── */}
      <View style={styles.portfolioCard}>
        <Text style={styles.portLabel}>Total Project Portfolio</Text>
        <Text style={styles.portValue}>{formatInr(totalEligible)}</Text>
        <View style={styles.portRow}>
          <Text style={styles.portSub}>Subsidy Proposed</Text>
          <Text style={[styles.portSub, { color: '#fbbf24' }]}>{formatInr(stats?.total_subsidy_proposed)}</Text>
        </View>
        <View style={styles.portRow}>
          <Text style={styles.portSub}>Subsidy Released</Text>
          <Text style={[styles.portSub, { color: '#34d399' }]}>{formatInr(stats?.total_subsidy_received)}</Text>
        </View>
      </View>

      {/* ── Tappable KPI grid ── */}
      <Text style={styles.section}>BANK PIPELINE — TAP TO VIEW</Text>
      <View style={styles.kpiRow}>
        <TapKpi
          label="Bank WIP"      value={bankWip}        color="#1565C0"
          emoji="🏦"            sub="Pending sanction" onPress={() => goToCases('bank_processing')}
        />
        <TapKpi
          label="Sanctioned"    value={bankSanctioned} color="#2E7D46"
          emoji="✅"            sub="Loan approved"    onPress={() => goToCases('bank_processing')}
        />
      </View>
      <View style={styles.kpiRow}>
        <TapKpi
          label="GOC Applied"   value={gocApplied}     color="#f59e0b"
          emoji="📜"            sub="Awaiting GOC"     onPress={() => goToCases('goc_registration')}
        />
        <TapKpi
          label="GOC Approved"  value={gocApproved}    color="#22c55e"
          emoji="🎯"            sub="GOC received"     onPress={() => goToCases('goc_registration')}
        />
      </View>

      {/* ── Subsidy & Completion ── */}
      <Text style={styles.section}>SUBSIDY & COMPLETION</Text>
      <View style={styles.kpiRow}>
        <TapKpi
          label="Subsidy Queue" value={subsidyCount}             color="#0ea5e9"
          emoji="💸"            sub="Claim · Inspection · Comm." onPress={() => goToCases('subsidy_claim')}
        />
        <TapKpi
          label="Completed"     value={stats?.completed ?? 0}   color="#6366f1"
          emoji="🏆"            sub="Subsidy released"          onPress={() => goToCases('completed')}
        />
      </View>

      {/* ── All stages quick view ── */}
      <Text style={styles.section}>ALL STAGES SNAPSHOT</Text>
      <View style={styles.snapshotCard}>
        {[
          { label: 'Onboarding',       stages: ['farmer_onboarding', 'document_collection'], color: '#6366f1' },
          { label: 'Design / DPR',     stages: ['site_visit', 'design_boq', 'dpr_ready'],    color: '#0ea5e9' },
          { label: 'Bank Processing',  stages: ['bank_processing'],                           color: '#1565C0' },
          { label: 'GOC Registration', stages: ['goc_registration'],                          color: '#f59e0b' },
          { label: 'Construction M1–M7', stages: ['m1_foundation','m2_structure_erection','m3_covering_material','m4_trellising','m5_drip_fitting','m6_bed_preparation','m7_plantation'], color: '#ea580c' },
          { label: 'Subsidy Processing', stages: ['subsidy_claim','agency_inspection','committee_meeting'], color: '#0ea5e9' },
          { label: 'Released / Done',  stages: ['subsidy_released', 'completed'],             color: '#22c55e' },
        ].map(({ label, stages, color }) => {
          const count = stages.reduce((n, s) => n + (sb[s] ?? 0), 0);
          if (count === 0) return null;
          return (
            <View key={label} style={styles.snapRow}>
              <View style={[styles.snapDot, { backgroundColor: color }]} />
              <Text style={styles.snapLabel}>{label}</Text>
              <Text style={[styles.snapCount, { color }]}>{count}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  errBox:       { backgroundColor: '#FFEBEE', margin: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errTxt:       { color: '#C62828', fontSize: 13, fontWeight: '600' },
  portfolioCard:{ backgroundColor: '#1565C0', margin: SPACING.md, borderRadius: 14, padding: SPACING.lg },
  portLabel:    { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 },
  portValue:    { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: SPACING.sm },
  portRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  portSub:      { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  section:      { fontSize: 11, fontWeight: '800', color: COLORS.subtext, letterSpacing: 0.6, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  kpiRow:       { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: 8, marginBottom: 8 },
  kpi:          { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, borderTopWidth: 3, elevation: 1 },
  kpiEmoji:     { fontSize: 20, marginBottom: 4 },
  kpiVal:       { fontSize: 24, fontWeight: '900' },
  kpiLbl:       { fontSize: 11, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  kpiSub:       { fontSize: 10, color: COLORS.subtext, marginTop: 1 },
  kpiTap:       { fontSize: 10, fontWeight: '700', marginTop: 6 },
  snapshotCard: { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, elevation: 1 },
  snapRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  snapDot:      { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.sm },
  snapLabel:    { flex: 1, fontSize: 12, color: COLORS.subtext },
  snapCount:    { fontSize: 16, fontWeight: '800' },
});
