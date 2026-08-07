/**
 * Project Manager + Contractor dashboard.
 * Sites list from erection API; PM also loads /role-kpis for follow-ups & stage load.
 */
import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useGetErectionProjectsQuery } from '../../store/api/erectionApi';
import { useGetRoleKpisQuery } from '../../store/api/dashboardApi';
import { useAuthContext } from '../../context/AuthContext';
import { OfflineBanner }  from '../../components/shared/OfflineBanner';
import { EmptyState }     from '../../components/shared/EmptyState';
import { KpiCard }        from '../../components/shared/KpiCard';
import { stageLabel }     from '../../constants/stages';
import { ROLES }          from '../../constants/roles';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import type { NavigationProp } from '@react-navigation/native';

const ORANGE = '#E65100';
const CONSTRUCTION_STAGES = [
  'm1_foundation', 'm2_structure_erection', 'm3_covering_material', 'm4_trellising',
  'm5_drip_fitting', 'm6_bed_preparation', 'm7_plantation',
  'site_visit', 'design_boq', 'dpr_ready',
];

export default function ErectionDashboard({ navigation }: { navigation: NavigationProp<any> }) {
  const { user } = useAuthContext();
  const isPm = user?.role === ROLES.PROJECT_MANAGER;

  const sitesQ = useGetErectionProjectsQuery();
  const kpisQ  = useGetRoleKpisQuery(undefined, { skip: !isPm && !user?.role?.includes('contractor') });
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      sitesQ.refetch(),
      ...(kpisQ.isUninitialized ? [] : [kpisQ.refetch()]),
    ]);
    setRefreshing(false);
  }, [sitesQ, kpisQ]);

  const sites = (sitesQ.data?.items ?? []).filter((p) =>
    CONSTRUCTION_STAGES.includes(p.project_stage),
  );
  const k = kpisQ.data ?? {};
  const isError = sitesQ.isError;
  const isFetching = sitesQ.isFetching || kpisQ.isFetching;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || isFetching}
          onRefresh={onRefresh}
          colors={[ORANGE]}
          tintColor={ORANGE}
        />
      }
    >
      <OfflineBanner />
      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Could not load sites. Pull to retry.</Text>
        </View>
      )}

      <View style={styles.summary}>
        <Text style={styles.summaryCount}>{sites.length}</Text>
        <Text style={styles.summaryLabel}>Active Sites</Text>
      </View>

      {/* PM role-kpis strip */}
      {isPm && kpisQ.data && (
        <>
          {Number(k.follow_up_pending) > 0 && (
            <View style={styles.situation}>
              <Text style={styles.sitText}>
                <Text style={{ fontWeight: '800' }}>{String(k.follow_up_pending)}</Text>
                {' '}site visit follow-up{Number(k.follow_up_pending) > 1 ? 's' : ''} pending
              </Text>
            </View>
          )}
          <View style={styles.kpiRow}>
            <KpiCard
              label="Assigned"
              value={Number(k.total_assigned_projects ?? 0)}
              emoji="📋"
              accentColor="#1565C0"
            />
            <KpiCard
              label="Construction"
              value={Number(k.active_construction ?? 0)}
              emoji="🏗️"
              accentColor={ORANGE}
            />
            <KpiCard
              label="Follow-ups"
              value={Number(k.follow_up_pending ?? 0)}
              emoji="🔔"
              accentColor={Number(k.follow_up_pending) > 0 ? '#C62828' : '#2E7D46'}
              alert={Number(k.follow_up_pending) > 0}
              severity={Number(k.follow_up_pending) > 0 ? 'warn' : 'ok'}
            />
          </View>
        </>
      )}

      {/* Contractor role-kpis when present */}
      {!isPm && kpisQ.data && (
        <View style={styles.kpiRow}>
          <KpiCard
            label="My Assignments"
            value={Number(k.my_total ?? sites.length)}
            emoji="📋"
            accentColor={ORANGE}
          />
          <KpiCard
            label="Active"
            value={Number(k.my_active ?? sites.length)}
            emoji="⚙️"
            accentColor="#1565C0"
          />
          <KpiCard
            label="Completed"
            value={Number(k.my_completed ?? 0)}
            emoji="✅"
            accentColor="#2E7D46"
          />
        </View>
      )}

      <Text style={styles.section}>SITES</Text>
      {sites.length === 0 ? (
        <EmptyState emoji="🏗️" message="No active construction sites assigned." />
      ) : (
        sites.map((p) => {
          const milestoneNum = p.project_stage.startsWith('m')
            ? parseInt(p.project_stage[1], 10)
            : 0;
          const pct = milestoneNum > 0 ? Math.round((milestoneNum / 7) * 100) : 10;
          return (
            <TouchableOpacity
              key={p.id}
              style={styles.siteCard}
              onPress={() => navigation.navigate('Milestones', { projectId: p.id })}
            >
              <View style={styles.siteHeader}>
                <Text style={styles.siteName} numberOfLines={1}>
                  {p.project_name ?? `Project #${p.id}`}
                </Text>
                <Text style={styles.stageChip}>{stageLabel(p.project_stage)}</Text>
              </View>
              <Text style={styles.siteSub}>
                {p.farmer
                  ? `${p.farmer.first_name} ${p.farmer.last_name ?? ''}`.trim()
                  : '—'}
                {p.village ? ` · ${p.village}` : ''}
              </Text>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
              </View>
              <Text style={styles.progressText}>{pct}% complete</Text>
            </TouchableOpacity>
          );
        })
      )}
      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  errorBanner:  { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:    { color: '#C62828', fontSize: 13, fontWeight: '600' },
  summary:      { backgroundColor: ORANGE, margin: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center' },
  summaryCount: { fontSize: 36, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  situation:    { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, padding: SPACING.md, backgroundColor: '#FEF2F2', borderRadius: RADIUS.md, borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  sitText:      { fontSize: 13, color: COLORS.text },
  kpiRow:       { flexDirection: 'row', paddingHorizontal: SPACING.sm, marginBottom: SPACING.sm },
  section:      { fontSize: 11, fontWeight: '800', color: COLORS.subtext, letterSpacing: 0.6, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  siteCard:     { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md, elevation: 2 },
  siteHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  siteName:     { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  stageChip:    { fontSize: 10, fontWeight: '700', color: ORANGE, backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  siteSub:      { fontSize: 11, color: COLORS.subtext, marginBottom: SPACING.sm },
  progressBg:   { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: ORANGE, borderRadius: 3 },
  progressText: { fontSize: 10, color: COLORS.subtext, marginTop: 4, textAlign: 'right' },
});
