/**
 * Bank Officer + Agency Officer dashboard.
 * Sole KPI source: GET /dashboard/role-kpis (JWT-scoped).
 * Stats used only for optional portfolio totals when present.
 */
import React, { useState, useCallback } from 'react';
import {
  ScrollView, RefreshControl, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthContext } from '../../context/AuthContext';
import { useGetStatsQuery, useGetRoleKpisQuery } from '../../store/api/dashboardApi';
import { OfflineBanner } from '../../components/shared/OfflineBanner';
import { KpiCard } from '../../components/shared/KpiCard';
import { formatInr } from '../../utils/format';
import { stageLabel } from '../../constants/stages';
import { ROLES } from '../../constants/roles';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function LoanDashboard() {
  const navigation = useNavigation<any>();
  const { user } = useAuthContext();
  const isAgency = user?.role === ROLES.AGENCY_OFFICER;

  const statsQ = useGetStatsQuery();
  const kpisQ  = useGetRoleKpisQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([statsQ.refetch(), kpisQ.refetch()]);
    setRefreshing(false);
  }, [statsQ, kpisQ]);

  const k = kpisQ.data ?? {};
  const stats = statsQ.data;
  const queue = (k.queue as any[]) ?? [];
  const isError = kpisQ.isError || statsQ.isError;
  const isFetching = kpisQ.isFetching || statsQ.isFetching;

  const goToCases = (initialStage?: string) => {
    navigation.navigate('Cases', {
      screen: 'Pipeline',
      params: initialStage ? { initialStage } : undefined,
    });
  };

  const accent = isAgency ? '#7C3AED' : '#1565C0';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || isFetching}
          onRefresh={onRefresh}
          colors={[accent]}
          tintColor={accent}
        />
      }
    >
      <OfflineBanner />
      {isError && (
        <View style={styles.errBox}>
          <Text style={styles.errTxt}>Could not load analytics. Pull down to retry.</Text>
        </View>
      )}

      {/* Situation banner */}
      {isAgency ? (
        Number(k.pending_inspection) > 0 && (
          <View style={[styles.situation, { borderLeftColor: '#F59E0B' }]}>
            <Text style={styles.sitText}>
              <Text style={styles.sitBold}>{String(k.pending_inspection)}</Text>
              {' '}inspection{Number(k.pending_inspection) > 1 ? 's' : ''} waiting
              {Number(k.committee_pending) > 0
                ? ` · ${k.committee_pending} committee pending`
                : ''}
            </Text>
            <TouchableOpacity onPress={() => goToCases('agency_inspection')}>
              <Text style={[styles.sitLink, { color: accent }]}>Open →</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        Number(k.awaiting_sanction) > 0 && (
          <View style={[styles.situation, { borderLeftColor: '#EF4444' }]}>
            <Text style={styles.sitText}>
              <Text style={styles.sitBold}>{String(k.awaiting_sanction)}</Text>
              {' '}loan file{Number(k.awaiting_sanction) > 1 ? 's' : ''} awaiting sanction
            </Text>
            <TouchableOpacity onPress={() => goToCases('bank_processing')}>
              <Text style={[styles.sitLink, { color: accent }]}>Open →</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      {/* Hero portfolio */}
      <View style={[styles.portfolioCard, { backgroundColor: accent }]}>
        <Text style={styles.portLabel}>
          {isAgency ? 'Subsidy Released' : 'Total Loan Sanctioned'}
        </Text>
        <Text style={styles.portValue}>
          {formatInr(
            isAgency
              ? Number(k.total_released ?? 0)
              : Number(k.total_loan_sanctioned ?? 0),
          )}
        </Text>
        {!isAgency && (
          <>
            <View style={styles.portRow}>
              <Text style={styles.portSub}>Eligible (sanctioned projects)</Text>
              <Text style={[styles.portSub, { color: '#fbbf24' }]}>
                {formatInr(Number(k.total_eligible_cost ?? 0))}
              </Text>
            </View>
            <View style={styles.portRow}>
              <Text style={styles.portSub}>Approval rate</Text>
              <Text style={[styles.portSub, { color: '#34d399' }]}>
                {String(k.approval_rate_pct ?? 0)}%
              </Text>
            </View>
          </>
        )}
        {isAgency && (
          <View style={styles.portRow}>
            <Text style={styles.portSub}>Subsidy approved</Text>
            <Text style={[styles.portSub, { color: '#fbbf24' }]}>
              {formatInr(Number(k.total_subsidy_approved ?? 0))}
            </Text>
          </View>
        )}
      </View>

      {isAgency ? (
        <>
          <Text style={styles.section}>AGENCY PIPELINE</Text>
          <View style={styles.kpiRow}>
            <KpiCard
              label="Pending Inspections"
              value={Number(k.pending_inspection ?? 0)}
              emoji="🔍"
              accentColor="#F59E0B"
              alert={Number(k.pending_inspection) > 0}
              severity={Number(k.pending_inspection) > 0 ? 'warn' : 'ok'}
              onPress={() => goToCases('agency_inspection')}
            />
            <KpiCard
              label="Inspections Done"
              value={Number(k.inspections_done ?? 0)}
              emoji="✅"
              accentColor="#0EA5E9"
              sub={`Pass rate ${k.pass_rate_pct ?? 0}%`}
            />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard
              label="Committee Pending"
              value={Number(k.committee_pending ?? 0)}
              emoji="🏛️"
              accentColor="#7C3AED"
              alert={Number(k.committee_pending) > 0}
              onPress={() => goToCases('committee_meeting')}
            />
            <KpiCard
              label="Pass Rate"
              value={`${k.pass_rate_pct ?? 0}%`}
              emoji="🎯"
              accentColor="#22C55E"
              target={80}
            />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.section}>BANK PIPELINE</Text>
          <View style={styles.kpiRow}>
            <KpiCard
              label="Awaiting Decision"
              value={Number(k.awaiting_sanction ?? 0)}
              emoji="🏦"
              accentColor="#EF4444"
              sub="No sanction date"
              alert={Number(k.awaiting_sanction) > 0}
              severity={
                Number(k.awaiting_sanction) > 5
                  ? 'breach'
                  : Number(k.awaiting_sanction) > 0
                    ? 'warn'
                    : 'ok'
              }
              onPress={() => goToCases('bank_processing')}
            />
            <KpiCard
              label="In Bank Processing"
              value={Number(k.pending_sanction ?? 0)}
              emoji="⏳"
              accentColor="#1565C0"
              onPress={() => goToCases('bank_processing')}
            />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard
              label="Loans Approved"
              value={Number(k.bank_approved ?? 0)}
              emoji="✅"
              accentColor="#2E7D46"
            />
            <KpiCard
              label="Approval Rate"
              value={`${k.approval_rate_pct ?? 0}%`}
              emoji="📈"
              accentColor={Number(k.approval_rate_pct) >= 80 ? '#22C55E' : '#F59E0B'}
              target={80}
              severity={
                Number(k.approval_rate_pct) >= 80
                  ? 'ok'
                  : Number(k.approval_rate_pct) >= 60
                    ? 'warn'
                    : 'breach'
              }
              sub={`${k.bank_approved ?? 0} of ${k.total_processed ?? 0}`}
            />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard
              label="Avg Loan"
              value={formatInr(Number(k.avg_loan_amount ?? 0))}
              emoji="💰"
              accentColor="#C8972A"
            />
            <KpiCard
              label="Completed"
              value={stats?.completed ?? 0}
              emoji="🏆"
              accentColor="#6366F1"
              onPress={() => goToCases('completed')}
            />
          </View>
        </>
      )}

      {/* Action queue from role-kpis */}
      <Text style={styles.section}>
        {isAgency ? 'INSPECTION QUEUE' : 'AWAITING SANCTION'} — TAP TO OPEN
      </Text>
      {queue.length === 0 ? (
        <Text style={styles.empty}>No items in queue</Text>
      ) : (
        queue.map((item: any) => (
          <TouchableOpacity
            key={item.projectId ?? item.id}
            style={styles.qRow}
            onPress={() =>
              navigation.navigate('Cases', {
                screen: 'ProjectDetail',
                params: { projectId: item.projectId },
              })
            }
            activeOpacity={0.75}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.qFarmer}>{item.farmer}</Text>
              <Text style={styles.qMeta}>
                {item.id} · {item.district}
                {item.stage ? ` · ${stageLabel(item.stage)}` : ''}
              </Text>
            </View>
            <View
              style={[
                styles.urgBadge,
                item.urgency === 'High' ? styles.urgHigh : styles.urgMed,
              ]}
            >
              <Text
                style={[
                  styles.urgTxt,
                  { color: item.urgency === 'High' ? '#EF4444' : '#F59E0B' },
                ]}
              >
                {item.urgency}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  errBox:        { backgroundColor: '#FFEBEE', margin: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errTxt:        { color: '#C62828', fontSize: 13, fontWeight: '600' },
  situation:     { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.md, marginTop: SPACING.md, padding: SPACING.md, backgroundColor: '#FFFBEB', borderRadius: RADIUS.md, borderLeftWidth: 4, gap: 8 },
  sitText:       { flex: 1, fontSize: 13, color: COLORS.text },
  sitBold:       { fontWeight: '800' },
  sitLink:       { fontWeight: '700', fontSize: 13 },
  portfolioCard: { margin: SPACING.md, borderRadius: 14, padding: SPACING.lg },
  portLabel:     { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 },
  portValue:     { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: SPACING.sm },
  portRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  portSub:       { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  section:       { fontSize: 11, fontWeight: '800', color: COLORS.subtext, letterSpacing: 0.6, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  kpiRow:        { flexDirection: 'row', paddingHorizontal: SPACING.sm },
  empty:         { textAlign: 'center', color: COLORS.subtext, padding: 24 },
  qRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1 },
  qFarmer:       { fontSize: 14, fontWeight: '700', color: COLORS.text },
  qMeta:         { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  urgBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  urgHigh:       { backgroundColor: 'rgba(239,68,68,0.1)' },
  urgMed:        { backgroundColor: 'rgba(245,158,11,0.1)' },
  urgTxt:        { fontSize: 11, fontWeight: '700' },
});
