import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetDocumentsQuery } from '../../store/api/documentsApi';
import { useGetStatsQuery }     from '../../store/api/dashboardApi';
import { KpiCard }              from '../../components/shared/KpiCard';
import { OfflineBanner }        from '../../components/shared/OfflineBanner';
import { COLORS, SPACING }      from '../../constants/theme';

export default function OfficeDashboard() {
  const { data: docs  = [] } = useGetDocumentsQuery({ status: 'pending' });
  const { data: stats }      = useGetStatsQuery();

  const pendingCount = docs.length;
  const dprCount     = stats?.stage_breakdown?.['dpr_ready']    ?? 0;
  const subsidyCount = stats?.pending_subsidy ?? 0;

  return (
    <ScrollView style={styles.screen}>
      <OfflineBanner />
      <View style={styles.kpiRow}>
        <KpiCard label="Pending Docs"  value={pendingCount} accentColor="#C62828" emoji="📄" />
        <KpiCard label="DPR Ready"     value={dprCount}     accentColor="#E65100" emoji="📐" />
        <KpiCard label="Subsidy Queue" value={subsidyCount} accentColor="#1565C0" emoji="💰" />
      </View>

      <Text style={styles.sectionTitle}>PENDING REVIEW</Text>
      {docs.slice(0, 8).map((doc) => (
        <View key={doc.id} style={styles.docItem}>
          <Text style={styles.docIcon}>📄</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.docName} numberOfLines={1}>
              {doc.document_type} — {doc.farmer_name ?? '—'}
            </Text>
            <Text style={styles.docMeta}>
              {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}
            </Text>
          </View>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Pending</Text>
          </View>
        </View>
      ))}
      {docs.length === 0 && (
        <Text style={styles.emptyTxt}>✅ No pending documents</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: COLORS.bg },
  kpiRow:       { flexDirection: 'row', padding: SPACING.md, gap: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  docItem:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1, gap: SPACING.md },
  docIcon:      { fontSize: 22 },
  docName:      { fontSize: 13, fontWeight: '700', color: COLORS.text },
  docMeta:      { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  pendingBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  pendingText:  { fontSize: 10, fontWeight: '700', color: '#E65100' },
  emptyTxt:     { textAlign: 'center', color: COLORS.subtext, padding: 32 },
});
