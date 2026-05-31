import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getProjects } from '../../api/client';
import { Card, StageBadge, LoadingScreen, EmptyState } from '../../components/UI';
import { colors, spacing, font } from '../../styles/theme';

const STAGES = [
  'farmer_onboarding','document_collection','site_visit','design_boq','dpr_ready',
  'bank_processing','goc_registration','m1_foundation','m2_structure_erection',
  'm3_covering_material','m4_trellising','m5_drip_fitting','m6_bed_preparation',
  'm7_plantation','subsidy_claim','agency_inspection','committee_meeting',
  'subsidy_released','completed',
];

export default function FarmerDashboard({ navigation }) {
  const { user } = useAuth();
  const [project, setProject]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getProjects({ limit: 1 });
      setProject(data?.[0] || null);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingScreen message="Loading your project…" />;

  const stageIdx  = project ? STAGES.indexOf(project.project_stage) : -1;
  const progress  = project ? Math.round(((stageIdx + 1) / STAGES.length) * 100) : 0;

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.first_name} 🌾</Text>
        <Text style={styles.sub}>Your Greenhouse Project</Text>
      </View>

      {!project ? (
        <View style={{ padding: spacing.lg }}>
          <EmptyState icon="🏗️" message="No project found. Contact your dealer to create one." />
        </View>
      ) : (
        <View style={{ padding: spacing.md }}>

          {/* Project card */}
          <Card>
            <View style={styles.projHeader}>
              <Text style={styles.projCode}>{project.project_code || `Project #${project.id}`}</Text>
              <StageBadge stage={project.project_stage} />
            </View>
            {project.area_type && <Text style={styles.detail}>📐 {project.area_type.name}</Text>}
            {project.land_area  && <Text style={styles.detail}>📏 {project.land_area} SQM</Text>}
          </Card>

          {/* Progress bar */}
          <Card>
            <Text style={styles.progressTitle}>Overall Progress — {progress}%</Text>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressStage}>
              Current: {project.project_stage?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Text>
          </Card>

          {/* Stage timeline */}
          <Card>
            <Text style={styles.timelineTitle}>19-Stage Workflow</Text>
            {STAGES.map((stage, i) => {
              const done    = i < stageIdx;
              const current = i === stageIdx;
              return (
                <View key={stage} style={styles.timelineRow}>
                  <View style={[
                    styles.timelineDot,
                    done    && styles.dotDone,
                    current && styles.dotCurrent,
                  ]}>
                    <Text style={styles.dotText}>{done ? '✓' : i + 1}</Text>
                  </View>
                  <Text style={[styles.stageName, done && styles.stageNameDone, current && styles.stageNameCurrent]}>
                    {stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Text>
                </View>
              );
            })}
          </Card>

          {/* Subsidy info */}
          {(project.total_subsidy_amount_proposed > 0) && (
            <Card style={styles.subsidyCard}>
              <Text style={styles.subsidyTitle}>💰 Subsidy Summary</Text>
              <View style={styles.subsidyRow}>
                <Text style={styles.subsidyLabel}>Proposed</Text>
                <Text style={styles.subsidyValue}>
                  ₹{(project.total_subsidy_amount_proposed / 100000).toFixed(2)} L
                </Text>
              </View>
              {project.total_subsidy_received > 0 && (
                <View style={styles.subsidyRow}>
                  <Text style={styles.subsidyLabel}>Received</Text>
                  <Text style={[styles.subsidyValue, { color: colors.success }]}>
                    ₹{(project.total_subsidy_received / 100000).toFixed(2)} L
                  </Text>
                </View>
              )}
            </Card>
          )}

          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => navigation.navigate('FarmerProjectDetail', { projectId: project.id })}
          >
            <Text style={styles.detailBtnText}>View Full Details & Documents →</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.primary, padding: spacing.lg, paddingTop: spacing.xl,
  },
  greeting: { color: colors.white, fontSize: font.xl, fontWeight: font.bold },
  sub: { color: colors.accent, fontSize: font.sm, marginTop: 4 },
  projHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  projCode: { fontSize: font.lg, fontWeight: font.bold, color: colors.text },
  detail: { fontSize: font.sm, color: colors.textMuted, marginTop: 4 },
  progressTitle: { fontSize: font.sm, fontWeight: font.semi, color: colors.text, marginBottom: spacing.sm },
  progressBg: { height: 12, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 6 },
  progressStage: { fontSize: font.xs, color: colors.textMuted, marginTop: spacing.sm },
  timelineTitle: { fontSize: font.base, fontWeight: font.bold, color: colors.text, marginBottom: spacing.md },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.border, justifyContent: 'center',
    alignItems: 'center', marginRight: spacing.md,
  },
  dotDone:    { backgroundColor: colors.success },
  dotCurrent: { backgroundColor: colors.primary },
  dotText:    { color: colors.white, fontSize: 11, fontWeight: font.bold },
  stageName:       { fontSize: font.sm, color: colors.textMuted },
  stageNameDone:   { color: colors.success },
  stageNameCurrent:{ color: colors.primary, fontWeight: font.semi },
  subsidyCard: { backgroundColor: colors.primary + '08' },
  subsidyTitle: { fontSize: font.base, fontWeight: font.bold, color: colors.primary, marginBottom: spacing.sm },
  subsidyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  subsidyLabel: { fontSize: font.sm, color: colors.textMuted },
  subsidyValue: { fontSize: font.sm, fontWeight: font.bold, color: colors.text },
  detailBtn: {
    backgroundColor: colors.primary, borderRadius: 10,
    padding: spacing.md, alignItems: 'center', marginBottom: spacing.xl,
  },
  detailBtnText: { color: colors.white, fontWeight: font.semi },
});
