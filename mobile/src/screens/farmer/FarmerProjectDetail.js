import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { getProjectById, getProjectDocuments } from '../../api/client';
import { Card, StageBadge, LoadingScreen } from '../../components/UI';
import { colors, spacing, font } from '../../styles/theme';
import { API_BASE_URL } from '../../api/client';

export default function FarmerProjectDetail({ route }) {
  const { projectId } = route.params;
  const [project, setProject]   = useState(null);
  const [docs,    setDocs]      = useState([]);
  const [loading, setLoading]   = useState(true);
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

  if (loading) return <LoadingScreen message="Loading project details…" />;
  if (!project) return <View style={styles.screen}><Text style={{ padding: 20 }}>Project not found.</Text></View>;

  const baseUrl = API_BASE_URL.replace('/api/v1', '');

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroCode}>{project.project_code || `Project #${project.id}`}</Text>
        <StageBadge stage={project.project_stage} />
      </View>

      <View style={{ padding: spacing.md }}>
        <Card>
          <Text style={styles.secTitle}>Project Details</Text>
          <InfoRow label="Structure"  value={project.area_type?.name} />
          <InfoRow label="Land Area"  value={project.land_area ? `${project.land_area} SQM` : null} />
          <InfoRow label="Khasra No." value={project.khasra_no} />
          <InfoRow label="Priority"   value={project.priority} />
        </Card>

        <Card>
          <Text style={styles.secTitle}>Bank Details</Text>
          <InfoRow label="Bank"   value={project.bank_branch?.bank?.name} />
          <InfoRow label="Branch" value={project.bank_branch?.branch_name} />
        </Card>

        {docs.length > 0 && (
          <Card>
            <Text style={styles.secTitle}>📎 Documents ({docs.length})</Text>
            {docs.map(doc => (
              <TouchableOpacity
                key={doc.id}
                style={styles.docRow}
                onPress={() => Linking.openURL(`${baseUrl}/${doc.file_path}`)}
              >
                <Text style={styles.docIcon}>
                  {doc.mime_type?.includes('pdf') ? '📄' : doc.mime_type?.includes('image') ? '🖼️' : '📎'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docType}>{doc.document_type}</Text>
                  <Text style={styles.docName} numberOfLines={1}>{doc.file_name}</Text>
                </View>
                {doc.is_verified && <Text style={styles.verified}>✓ Verified</Text>}
              </TouchableOpacity>
            ))}
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
  heroCode: { color: colors.white, fontSize: font.xl, fontWeight: font.bold },
  secTitle: { fontSize: font.base, fontWeight: font.bold, color: colors.text, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: font.sm, color: colors.textMuted },
  infoValue: { fontSize: font.sm, fontWeight: font.semi, color: colors.text, maxWidth: '60%', textAlign: 'right' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border },
  docIcon: { fontSize: 22 },
  docType: { fontSize: font.sm, fontWeight: font.semi, color: colors.text },
  docName: { fontSize: font.xs, color: colors.textMuted },
  verified: { fontSize: font.xs, color: colors.success, fontWeight: font.semi },
});
