import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getProjectStats, getRoleKpis } from '../../api/client';
import { Card, KpiCard, SectionHeader, StageBadge, LoadingScreen } from '../../components/UI';
import { colors, spacing, font } from '../../styles/theme';

const ROLE_LABELS = {
  admin: 'Admin', owner: 'Owner', office_staff: 'Office Staff',
  project_manager: 'Project Manager', bank_officer: 'Bank Officer',
  agency_officer: 'Agency Officer', agronomist: 'Agronomist',
};

export default function AdminDashboard({ navigation }) {
  const { user } = useAuth();
  const [stats,   setStats]       = useState(null);
  const [kpis,    setKpis]        = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [s, k] = await Promise.all([
        getProjectStats(user.id, user.role),
        getRoleKpis(user.role, user.id),
      ]);
      setStats(s);
      setKpis(k);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingScreen message="Loading dashboard…" />;

  const s = stats || {};

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.first_name} 👋</Text>
          <Text style={styles.sub}>{ROLE_LABELS[user?.role] || 'Admin'} Dashboard</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ANotifications')}>
          <Text style={{ fontSize: 24 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Pipeline KPIs */}
      <View style={styles.kpiGrid}>
        <KpiCard label="Total Projects" value={s.total_projects}  color={colors.primary} />
        <KpiCard label="Active"         value={s.active_projects} color={colors.success} />
        <KpiCard label="Completed"      value={s.completed}       color={colors.info} />
        <KpiCard label="Pending Docs"   value={s.pending_documents || '—'} color={colors.warning} />
      </View>

      {/* Quick Actions */}
      <View style={{ paddingHorizontal: spacing.md }}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionsGrid}>
          {[
            { emoji: '📁', label: 'All Projects', nav: () => navigation.navigate('AProjects') },
            { emoji: '✅', label: 'Verify Docs',  nav: () => navigation.navigate('AProjects', { screen: 'DocumentVerify' }) },
            { emoji: '🔔', label: 'Notifications',nav: () => navigation.navigate('ANotifications') },
            { emoji: '👤', label: 'Profile',      nav: () => navigation.navigate('AProfile') },
          ].map(a => (
            <TouchableOpacity key={a.label} style={styles.actionCard} onPress={a.nav}>
              <Text style={styles.actionEmoji}>{a.emoji}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stage pipeline */}
      {s.pipeline_stack?.length > 0 && (
        <View style={{ paddingHorizontal: spacing.md }}>
          <SectionHeader title="Pipeline by Stage"
            action="View All" onAction={() => navigation.navigate('AProjects')} />
          {s.pipeline_stack.slice(0, 6).map((item) => (
            <TouchableOpacity
              key={item.stage}
              onPress={() => navigation.navigate('AProjects')}
            >
              <Card style={styles.pipelineRow}>
                <View style={{ flex: 1 }}>
                  <StageBadge stage={item.stage} />
                </View>
                <Text style={styles.pipelineCount}>{item.count}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Action queue from role KPIs */}
      {kpis?.action_queue?.length > 0 && (
        <View style={{ paddingHorizontal: spacing.md }}>
          <SectionHeader title="Needs Attention" />
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
  header: {
    backgroundColor: colors.primary, padding: spacing.lg, paddingTop: spacing.xl,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { color: colors.white, fontSize: font.xl, fontWeight: font.bold },
  sub:      { color: colors.accent, fontSize: font.sm, marginTop: 2 },
  kpiGrid:  { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  actionCard: {
    width: '47%', backgroundColor: colors.card,
    borderRadius: 12, padding: spacing.md,
    alignItems: 'center', gap: spacing.xs,
    borderWidth: 1.5, borderColor: colors.border,
  },
  actionEmoji: { fontSize: 28 },
  actionLabel: { fontSize: font.sm, fontWeight: font.semi, color: colors.text, textAlign: 'center' },
  pipelineRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm, padding: spacing.sm,
  },
  pipelineCount: { fontSize: font.xl, fontWeight: font.bold, color: colors.primary },
  queueItem: { marginBottom: spacing.sm },
  queueTitle: { fontSize: font.base, fontWeight: font.semi, color: colors.text },
  queueSub:   { fontSize: font.sm, color: colors.textMuted, marginTop: 4 },
});
