import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Alert, RefreshControl, StyleSheet } from 'react-native';
import { useGetMilestonesQuery, useUpdateMilestoneMutation } from '../../store/api/erectionApi';
import { EmptyState }    from '../../components/shared/EmptyState';
import { OfflineBanner } from '../../components/shared/OfflineBanner';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import type { RouteProp } from '@react-navigation/native';

const ORANGE = '#E65100';
const MILESTONE_KEYS = ['m1_foundation','m2_structure_erection','m3_covering_material','m4_trellising','m5_drip_fitting','m6_bed_preparation','m7_plantation'];
const MILESTONE_LABELS: Record<string,string> = {
  m1_foundation:'M1 — Foundation', m2_structure_erection:'M2 — Structure Erection',
  m3_covering_material:'M3 — Covering Material', m4_trellising:'M4 — Trellising',
  m5_drip_fitting:'M5 — Drip Fitting', m6_bed_preparation:'M6 — Bed Preparation',
  m7_plantation:'M7 — Plantation',
};

export default function MilestoneTrackerScreen({ route }: { route: RouteProp<any, any> }) {
  const projectId = route.params?.projectId as number | undefined;
  const { data: milestones = [], isFetching, refetch } = useGetMilestonesQuery(projectId ?? 0, { skip: !projectId });
  const [updateMilestone] = useUpdateMilestoneMutation();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  if (!projectId) return <EmptyState emoji="🧱" message="Open a project from the Sites tab to view milestones." />;

  const display = MILESTONE_KEYS.map(key => {
    const found = milestones.find(m => m.key === key);
    return found ?? { key, status: 'pending' as const, progress_pct: 0, photos_count: 0, signed_off: false };
  });

  const firstActiveIdx = display.findIndex(m => !m.signed_off && m.status !== 'completed');

  const handleSignOff = (key: string) => {
    Alert.alert(`Sign Off ${MILESTONE_LABELS[key]}?`, 'This action will be logged.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Off', onPress: async () => { await updateMilestone({ project_id: projectId, milestone_key: key, progress_pct: 100, description: 'Signed off via mobile' }); } },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      refreshControl={<RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} colors={[ORANGE]} />}
    >
      <OfflineBanner />
      {display.map((m, idx) => {
        const isDone   = m.signed_off || m.status === 'completed';
        const isActive = !isDone && idx === firstActiveIdx;
        return (
          <View key={m.key} style={[styles.card, isDone && { opacity: 0.65 }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.dot, isDone && styles.dotDone, isActive && styles.dotActive]}>
                <Text style={styles.dotTxt}>{isDone ? '✓' : String(idx + 1)}</Text>
              </View>
              <Text style={styles.mLabel}>{MILESTONE_LABELS[m.key]}</Text>
              <View style={[styles.badge, isDone ? styles.badgeDone : isActive ? styles.badgeActive : styles.badgePending]}>
                <Text style={[styles.badgeTxt, isDone ? { color: COLORS.primary } : isActive ? { color: ORANGE } : { color: COLORS.subtext }]}>
                  {isDone ? 'Done' : isActive ? 'Active' : 'Pending'}
                </Text>
              </View>
            </View>
            {isActive && (
              <View style={{ marginTop: SPACING.sm }}>
                <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${m.progress_pct}%` as any }]} /></View>
                <Text style={styles.pctText}>{m.progress_pct}%</Text>
                <TouchableOpacity style={styles.signOffBtn} onPress={() => handleSignOff(m.key)}>
                  <Text style={styles.signOffTxt}>Sign Off →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card:       { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dot:        { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dotDone:    { backgroundColor: COLORS.primary },
  dotActive:  { backgroundColor: ORANGE },
  dotTxt:     { fontSize: 11, fontWeight: '800', color: '#fff' },
  mLabel:     { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeDone:  { backgroundColor: '#E8F5E9' },
  badgeActive:{ backgroundColor: '#FFF3E0' },
  badgePending:{ backgroundColor: '#F5F5F5' },
  badgeTxt:   { fontSize: 10, fontWeight: '700' },
  progressBg: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill:{ height: '100%', backgroundColor: ORANGE },
  pctText:    { fontSize: 11, color: COLORS.subtext, textAlign: 'right', marginBottom: SPACING.sm },
  signOffBtn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 8, alignItems: 'center' },
  signOffTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
