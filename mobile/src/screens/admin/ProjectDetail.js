import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { getProjectById, getProjectDocuments, updateProjectStage } from '../../api/client';
import { Card, StageBadge, Button, LoadingScreen } from '../../components/UI';
import { colors, spacing, font } from '../../styles/theme';

const STAGE_ORDER = [
  'farmer_onboarding','document_collection','site_visit','design_boq','dpr_ready',
  'bank_processing','goc_registration','m1_foundation','m2_structure_erection',
  'm3_covering_material','m4_trellising','m5_drip_fitting','m6_bed_preparation',
  'm7_plantation','subsidy_claim','agency_inspection','committee_meeting',
  'subsidy_released','completed',
];

export default function ProjectDetail({ route, navigation }) {
  const { projectId } = route.params;
  const [project, setProject]     = useState(null);
  const [docs,    setDocs]        = useState([]);
  const [loading, setLoading]     = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [p, d] = await Promise.all([
        getProjectById(projectId),
        getProjectDocuments(projectId),
      ]);
      setProject(p);
      setDocs(d.documents || []);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  const advanceStage = async () => {
    const idx = STAGE_ORDER.indexOf(project.project_stage);
    if (idx < 0 || idx >= STAGE_ORDER.length - 1) {
      Alert.alert('Already at final stage.'); return;
    }
    const next = STAGE_ORDER[idx + 1];
    Alert.alert(
      'Advance Stage',
      `Move to: ${next.replace(/_/g, ' ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Advance',
          onPress: async () => {
            setAdvancing(true);
            try {
              await updateProjectStage(projectId, next);
              await load(true);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to advance stage.');
            } finally { setAdvancing(false); }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingScreen message="Loading project…" />;
  if (!project) return <View style={styles.screen}><Text style={{ padding: 20 }}>Not found.</Text></View>;

  const idx     = STAGE_ORDER.indexOf(project.project_stage);
  const hasNext = idx < STAGE_ORDER.length - 1;

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroCode}>{project.project_code || `Project #${project.id}`}</Text>
        <StageBadge stage={project.project_stage} />
      </View>

      <View style={{ padding: spacing.md }}>

        {/* Stage advance */}
        {hasNext && (
          <Button
            title={advancing ? 'Advancing…' : `Advance → ${STAGE_ORDER[idx+1]?.replace(/_/g,' ')}`}
            onPress={advanceStage}
            loading={advancing}
            style={{ marginBottom: spacing.md }}
          />
        )}

        {/* Info */}
        <Card>
          <Text style={styles.secTitle}>Project Info</Text>
          <InfoRow label="Farmer"    value={`${project.farmer?.first_name} ${project.farmer?.last_name || ''}`} />
          <InfoRow label="Dealer"    value={project.dealer?.first_name} />
          <InfoRow label="Structure" value={project.area_type?.name} />
          <InfoRow label="Land Area" value={project.land_area ? `${project.land_area} SQM` : null} />
          <InfoRow label="Khasra"    value={project.khasra_no} />
          <InfoRow label="Priority"  value={project.priority} />
        </Card>

        {/* Documents */}
        <Card>
          <View style={styles.docHeader}>
            <Text style={styles.secTitle}>Documents ({docs.length})</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('DocumentUpload', { projectId })}
              style={styles.uploadBtn}
            >
              <Text style={styles.uploadBtnText}>+ Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('DocumentVerify', { projectId, docs })}
              style={[styles.uploadBtn, { marginLeft: spacing.sm }]}
            >
              <Text style={styles.uploadBtnText}>Verify All</Text>
            </TouchableOpacity>
          </View>
          {docs.length === 0
            ? <Text style={styles.noDoc}>No documents uploaded yet.</Text>
            : docs.map(doc => (
                <View key={doc.id} style={styles.docRow}>
                  <Text style={styles.docIcon}>
                    {doc.mime_type?.includes('pdf') ? '📄' : doc.mime_type?.includes('image') ? '🖼️' : '📎'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docType}>{doc.document_type}</Text>
                    <Text style={styles.docName} numberOfLines={1}>{doc.file_name}</Text>
                  </View>
                  <Text style={doc.is_verified ? styles.verified : styles.unverified}>
                    {doc.is_verified ? '✓' : '○'}
                  </Text>
                </View>
              ))
          }
        </Card>

        {/* Financials */}
        {project.total_subsidy_amount_proposed > 0 && (
          <Card>
            <Text style={styles.secTitle}>💰 Financials</Text>
            <InfoRow label="Eligible Cost" value={project.total_eligible_project_cost ? `₹${(project.total_eligible_project_cost/100000).toFixed(2)}L` : null} />
            <InfoRow label="Subsidy Proposed" value={project.total_subsidy_amount_proposed ? `₹${(project.total_subsidy_amount_proposed/100000).toFixed(2)}L` : null} />
            <InfoRow label="Subsidy Released" value={project.total_subsidy_received ? `₹${(project.total_subsidy_received/100000).toFixed(2)}L` : null} />
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const InfoRow = ({ label, value }) => value ? (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
) : null;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: {
    backgroundColor: colors.primary, padding: spacing.lg, paddingTop: spacing.xl,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  heroCode: { color: colors.white, fontSize: font.xl, fontWeight: font.bold, flex: 1 },
  secTitle: { fontSize: font.base, fontWeight: font.bold, color: colors.text, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: font.sm, color: colors.textMuted },
  infoValue: { fontSize: font.sm, fontWeight: font.semi, color: colors.text, maxWidth: '55%', textAlign: 'right' },
  docHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  uploadBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4,
    backgroundColor: colors.primary + '15', borderRadius: 6 },
  uploadBtnText: { fontSize: font.xs, color: colors.primary, fontWeight: font.semi },
  noDoc: { fontSize: font.sm, color: colors.textMuted, textAlign: 'center', padding: spacing.md },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border },
  docIcon: { fontSize: 20 },
  docType: { fontSize: font.sm, fontWeight: font.semi, color: colors.text },
  docName: { fontSize: font.xs, color: colors.textMuted },
  verified:   { fontSize: font.base, color: colors.success, fontWeight: font.bold },
  unverified: { fontSize: font.base, color: colors.textLight },
});
