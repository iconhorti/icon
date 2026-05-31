import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getRoleKpis, getProjects } from '../../api/client';
import { Card, KpiCard, SectionHeader, StageBadge, LoadingScreen } from '../../components/UI';
import { colors, spacing, font, radius, shadow } from '../../styles/theme';

// Construction stages M1–M7
const ERECTION_STAGES = [
  'm1_foundation', 'm2_structure_erection', 'm3_covering_material',
  'm4_trellising', 'm5_drip_fitting', 'm6_bed_preparation', 'm7_plantation',
];
const BANK_STAGES    = ['bank_processing', 'goc_registration'];
const SUBSIDY_STAGES = ['subsidy_claim', 'agency_inspection', 'committee_meeting', 'subsidy_released'];

// Section title with accent bar
const SecTitle = ({ emoji, title, color }) => (
  <View style={[styles.secTitle, { borderLeftColor: color }]}>
    <Text style={styles.secTitleText}>{emoji}  {title}</Text>
  </View>
);

// Mini stat row for Reports section
const StatRow = ({ label, value, color, onPress }) => (
  <TouchableOpacity style={styles.statRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
    <View style={[styles.statDot, { backgroundColor: color }]} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value ?? 0}</Text>
  </TouchableOpacity>
);

export default function DealerDashboard({ navigation }) {
  const { user } = useAuth();
  const [kpis,     setKpis]     = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [kpiData, projData] = await Promise.all([
        getRoleKpis('dealer', user?.id),
        getProjects({ limit: 200 }),
      ]);
      setKpis(kpiData);
      setProjects(projData || []);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingScreen message="Loading dashboard…" />;

  const s = kpis?.stats || {};

  // ── Compute stage-based counts from project list ────────────────────────────
  const count = (stages) => projects.filter(p => stages.includes(p.project_stage)).length;

  // Bank
  const bankProcessing = projects.filter(p => p.project_stage === 'bank_processing').length;
  const gocPending     = projects.filter(p => p.project_stage === 'goc_registration').length;
  const bankTotal      = count(BANK_STAGES);

  // Erection / Construction
  const underConstruction = count(ERECTION_STAGES);
  const erectionBreakdown = ERECTION_STAGES.map(st => ({
    stage: st,
    label: st.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    count: projects.filter(p => p.project_stage === st).length,
  })).filter(x => x.count > 0);

  // Subsidy
  const subsidyClaim     = projects.filter(p => p.project_stage === 'subsidy_claim').length;
  const agencyInspection = projects.filter(p => p.project_stage === 'agency_inspection').length;
  const committeeStage   = projects.filter(p => p.project_stage === 'committee_meeting').length;
  const subsidyReleased  = projects.filter(p => p.project_stage === 'subsidy_released').length;
  const subsidyCompleted = projects.filter(p => p.project_stage === 'completed').length;

  // Total subsidy amounts
  const totalProposed = projects.reduce((sum, p) => sum + (p.total_subsidy_amount_proposed || 0), 0);
  const totalReceived = projects.reduce((sum, p) => sum + (p.total_subsidy_received || 0), 0);

  const goToProjects = () => navigation.navigate('DProjects');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.first_name} 👋</Text>
          <Text style={styles.subGreeting}>Dealer Dashboard</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('DNotifications')}>
          <Text style={styles.bell}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* ── Overview KPIs ──────────────────────────────────────────────────── */}
      <View style={styles.kpiRow}>
        <KpiCard label="My Farmers"  value={s.my_farmers}      color={colors.dealer} />
        <KpiCard label="Projects"    value={projects.length}   color={colors.primary} />
        <KpiCard label="Completed"   value={subsidyCompleted}  color={colors.success} />
      </View>

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.md }}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionsGrid}>
          {[
            { emoji: '🌾', label: 'Register Farmer', nav: () => navigation.navigate('DFarmers', { screen: 'RegisterFarmer' }) },
            { emoji: '📁', label: 'New Project',     nav: () => navigation.navigate('DProjects', { screen: 'CreateProject' }) },
            { emoji: '👥', label: 'My Farmers',      nav: () => navigation.navigate('DFarmers') },
            { emoji: '📋', label: 'All Projects',    nav: goToProjects },
          ].map(a => (
            <TouchableOpacity key={a.label} style={styles.actionCard} onPress={a.nav}>
              <Text style={styles.actionEmoji}>{a.emoji}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Bank KPIs ──────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.md }}>
        <SecTitle emoji="🏦" title="Bank Status" color={colors.bank} />
        <View style={styles.kpiRow2}>
          <KpiCard label="Bank Processing" value={bankProcessing}  color={colors.bank} />
          <KpiCard label="GOC Pending"     value={gocPending}      color="#be185d" />
          <KpiCard label="Total at Bank"   value={bankTotal}       color={colors.info} />
        </View>
        <Card style={styles.reportCard}>
          <Text style={styles.reportTitle}>Bank Pipeline</Text>
          <StatRow label="Bank Processing"  value={bankProcessing}  color={colors.bank}    onPress={goToProjects} />
          <StatRow label="GOC Registration" value={gocPending}      color="#be185d"        onPress={goToProjects} />
          {bankTotal === 0 && <Text style={styles.nilText}>No projects at bank stage</Text>}
        </Card>
      </View>

      {/* ── Erection / Construction KPIs ───────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.md }}>
        <SecTitle emoji="🏗️" title="Construction / Erection" color="#15803d" />
        <View style={styles.kpiRow2}>
          <KpiCard label="Under Construction" value={underConstruction} color="#15803d" />
          <KpiCard label="M1–M3 Structure"    value={count(['m1_foundation','m2_structure_erection','m3_covering_material'])} color="#0891b2" />
          <KpiCard label="M4–M7 Finishing"    value={count(['m4_trellising','m5_drip_fitting','m6_bed_preparation','m7_plantation'])} color="#7c3aed" />
        </View>
        {erectionBreakdown.length > 0 && (
          <Card style={styles.reportCard}>
            <Text style={styles.reportTitle}>Stage Breakdown</Text>
            {erectionBreakdown.map(item => (
              <StatRow key={item.stage} label={item.label} value={item.count}
                color="#15803d" onPress={goToProjects} />
            ))}
          </Card>
        )}
        {underConstruction === 0 && (
          <Card style={styles.reportCard}>
            <Text style={styles.nilText}>No projects under construction</Text>
          </Card>
        )}
      </View>

      {/* ── Subsidy KPIs ───────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing.md }}>
        <SecTitle emoji="💰" title="Subsidy Status" color={colors.success} />
        <View style={styles.kpiRow2}>
          <KpiCard label="Claim Pending"  value={subsidyClaim}     color={colors.warning} />
          <KpiCard label="Inspection"     value={agencyInspection} color="#be185d" />
          <KpiCard label="Released"       value={subsidyReleased}  color={colors.success} />
        </View>

        <Card style={styles.reportCard}>
          <Text style={styles.reportTitle}>Subsidy Pipeline</Text>
          <StatRow label="Subsidy Claim Filed"   value={subsidyClaim}     color={colors.warning} onPress={goToProjects} />
          <StatRow label="Agency Inspection"     value={agencyInspection} color="#be185d"        onPress={goToProjects} />
          <StatRow label="Committee Meeting"     value={committeeStage}   color="#7c3aed"        onPress={goToProjects} />
          <StatRow label="Subsidy Released"      value={subsidyReleased}  color={colors.success} onPress={goToProjects} />
          <StatRow label="Project Completed"     value={subsidyCompleted} color={colors.primary} onPress={goToProjects} />
        </Card>

        {/* Subsidy Amount Summary */}
        {totalProposed > 0 && (
          <Card style={[styles.reportCard, styles.subsidyAmtCard]}>
            <Text style={styles.reportTitle}>Subsidy Amounts</Text>
            <View style={styles.amtRow}>
              <View style={styles.amtBox}>
                <Text style={styles.amtLabel}>Total Proposed</Text>
                <Text style={[styles.amtValue, { color: colors.warning }]}>
                  ₹{(totalProposed / 100000).toFixed(2)} L
                </Text>
              </View>
              <View style={[styles.amtBox, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
                <Text style={styles.amtLabel}>Total Received</Text>
                <Text style={[styles.amtValue, { color: colors.success }]}>
                  ₹{(totalReceived / 100000).toFixed(2)} L
                </Text>
              </View>
            </View>
          </Card>
        )}
      </View>

      {/* ── Action Queue ───────────────────────────────────────────────────── */}
      {kpis?.action_queue?.length > 0 && (
        <View style={{ paddingHorizontal: spacing.md }}>
          <SectionHeader title="⚠️ Needs Attention" />
          {kpis.action_queue.map((item, i) => (
            <Card key={i} style={styles.queueItem}>
              <Text style={styles.queueTitle}>{item.title}</Text>
              <Text style={styles.queueSub}>{item.description}</Text>
            </Card>
          ))}
        </View>
      )}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: colors.bg },
  content:  { paddingBottom: spacing.xl },
  header: {
    backgroundColor: colors.primary, padding: spacing.lg, paddingTop: spacing.xl,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greeting:    { color: colors.white, fontSize: font.xl, fontWeight: font.bold },
  subGreeting: { color: colors.accent, fontSize: font.sm },
  bell:        { fontSize: 24 },

  kpiRow:  { flexDirection: 'row', padding: spacing.md, gap: spacing.sm },
  kpiRow2: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },

  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.sm, marginBottom: spacing.lg,
  },
  actionCard: {
    width: '47%', backgroundColor: colors.card,
    borderRadius: 12, padding: spacing.md,
    alignItems: 'center', gap: spacing.xs,
    borderWidth: 1.5, borderColor: colors.border,
  },
  actionEmoji: { fontSize: 28 },
  actionLabel: { fontSize: font.sm, fontWeight: font.semi, color: colors.text, textAlign: 'center' },

  secTitle: {
    borderLeftWidth: 4, paddingLeft: spacing.sm,
    marginBottom: spacing.sm, marginTop: spacing.sm,
  },
  secTitleText: { fontSize: font.md, fontWeight: font.bold, color: colors.text },

  reportCard: { marginBottom: spacing.md },
  reportTitle: { fontSize: font.sm, fontWeight: font.bold, color: colors.textMuted,
    marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },

  statRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statDot:   { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  statLabel: { flex: 1, fontSize: font.sm, color: colors.text },
  statValue: { fontSize: font.lg, fontWeight: font.bold },

  nilText: { fontSize: font.sm, color: colors.textLight, textAlign: 'center', paddingVertical: spacing.sm },

  subsidyAmtCard: { backgroundColor: colors.success + '08' },
  amtRow:  { flexDirection: 'row' },
  amtBox:  { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  amtLabel:{ fontSize: font.xs, color: colors.textMuted, marginBottom: 4 },
  amtValue:{ fontSize: font.xl, fontWeight: font.bold },

  queueItem:  { marginBottom: spacing.sm },
  queueTitle: { fontSize: font.base, fontWeight: font.semi, color: colors.text },
  queueSub:   { fontSize: font.sm, color: colors.textMuted, marginTop: 4 },
});
