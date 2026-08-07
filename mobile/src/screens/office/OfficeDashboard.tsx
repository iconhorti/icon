/**
 * Office Staff dashboard.
 * Live sources: pending docs API + /dashboard/stats + /dashboard/role-kpis.
 */
import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, StyleSheet } from 'react-native';
import { useGetDocumentsQuery } from '../../store/api/documentsApi';
import { useGetStatsQuery, useGetRoleKpisQuery } from '../../store/api/dashboardApi';
import { KpiCard }              from '../../components/shared/KpiCard';
import { OfflineBanner }        from '../../components/shared/OfflineBanner';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function OfficeDashboard() {
  const docsQ  = useGetDocumentsQuery({ status: 'pending' });
  const statsQ = useGetStatsQuery();
  const kpisQ  = useGetRoleKpisQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([docsQ.refetch(), statsQ.refetch(), kpisQ.refetch()]);
    setRefreshing(false);
  }, [docsQ, statsQ, kpisQ]);

  const docs  = docsQ.data ?? [];
  const stats = statsQ.data;
  const k     = kpisQ.data ?? {};
  const sb    = stats?.stage_breakdown ?? {};

  const pendingCount   = docs.length;
  // Prefer role-kpis when present; fall back to stage_breakdown from stats
  const dprCount       = Number(k.dpr_ready ?? sb['dpr_ready'] ?? 0);
  const earlyPipeline  = Number(k.early_pipeline ?? (
    (sb['draft'] ?? 0) + (sb['farmer_onboarding'] ?? 0) + (sb['document_collection'] ?? 0)
  ));
  const subsidyCount   = stats?.pending_subsidy ?? 0;
  const kycAadhaar     = Number(k.with_aadhaar ?? 0);
  const kycPan         = Number(k.with_pan ?? 0);
  const totalFarmers   = Number(k.total_farmers ?? stats?.total_farmers ?? 0);
  const kycPct =
    totalFarmers > 0
      ? Math.round((Math.min(kycAadhaar, kycPan) / totalFarmers) * 100)
      : null;

  const isError = docsQ.isError || statsQ.isError;
  const isFetching = docsQ.isFetching || statsQ.isFetching || kpisQ.isFetching;

  return (
    <ScrollView
      style={styles.screen}
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
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ Could not load data. Pull down to retry.</Text>
        </View>
      )}

      {(pendingCount > 0 || earlyPipeline > 0) && (
        <View style={styles.situation}>
          <Text style={styles.sitText}>
            {pendingCount > 0 && (
              <>
                <Text style={styles.sitBold}>{pendingCount}</Text> docs pending review
              </>
            )}
            {pendingCount > 0 && earlyPipeline > 0 ? ' · ' : ''}
            {earlyPipeline > 0 && (
              <>
                <Text style={styles.sitBold}>{earlyPipeline}</Text> in onboarding
              </>
            )}
          </Text>
        </View>
      )}

      <View style={styles.kpiRow}>
        <KpiCard
          label="Pending Docs"
          value={pendingCount}
          accentColor="#C62828"
          emoji="📄"
          alert={pendingCount > 0}
          severity={pendingCount > 5 ? 'breach' : pendingCount > 0 ? 'warn' : 'ok'}
        />
        <KpiCard
          label="DPR Ready"
          value={dprCount}
          accentColor="#E65100"
          emoji="📐"
          alert={dprCount > 0}
        />
        <KpiCard
          label="Onboarding"
          value={earlyPipeline}
          accentColor="#6366F1"
          emoji="📋"
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          label="Subsidy Queue"
          value={subsidyCount}
          accentColor="#1565C0"
          emoji="💰"
        />
        <KpiCard
          label="KYC Complete"
          value={kycPct != null ? `${kycPct}%` : '—'}
          accentColor={kycPct != null && kycPct >= 90 ? '#2E7D46' : '#F59E0B'}
          emoji="🪪"
          target={90}
          sub={totalFarmers > 0 ? `Aadhaar ${kycAadhaar} · PAN ${kycPan}` : undefined}
        />
        <KpiCard
          label="Created by me"
          value={Number(k.staff_created ?? 0)}
          accentColor="#7C3AED"
          emoji="✍️"
        />
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
  situation:    { marginHorizontal: SPACING.md, marginTop: SPACING.md, padding: SPACING.md, backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, borderLeftWidth: 4, borderLeftColor: '#6366F1' },
  sitText:      { fontSize: 13, color: COLORS.text },
  sitBold:      { fontWeight: '800' },
  kpiRow:       { flexDirection: 'row', paddingHorizontal: SPACING.sm, paddingTop: SPACING.sm },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  docItem:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1, gap: SPACING.md },
  docIcon:      { fontSize: 22 },
  docName:      { fontSize: 13, fontWeight: '700', color: COLORS.text },
  docMeta:      { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  pendingBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  pendingText:  { fontSize: 10, fontWeight: '700', color: '#E65100' },
  emptyTxt:     { textAlign: 'center', color: COLORS.subtext, padding: 32 },
  errorBanner:  { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:    { color: '#C62828', fontSize: 13, fontWeight: '600' },
});
