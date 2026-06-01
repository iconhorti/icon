import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, RefreshControl, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import type { RouteProp }    from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useGetProjectsQuery }  from '../../store/api/projectsApi';
import { StageChip }            from '../../components/shared/StageChip';
import { EmptyState }           from '../../components/shared/EmptyState';
import { OfflineBanner }        from '../../components/shared/OfflineBanner';
import { formatInr }            from '../../utils/format';
import { stageLabel }           from '../../constants/stages';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export type PipelineListParams = {
  PipelineList: { stages: string[]; title: string };
};

export default function PipelineListScreen({ route }: any) {
  const { stages, title } = route.params as { stages: string[]; title: string };
  const [refreshing, setRefreshing] = useState(false);

  // Fetch for each stage and merge (API supports comma-joined stage param)
  const stageParam = stages.join(',');
  const { data, isLoading, isError, refetch } = useGetProjectsQuery(
    { stage: stageParam, limit: 200 },
    { skip: stages.length === 0 }
  );

  const projects = data?.items ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || isLoading}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      <OfflineBanner />

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>{projects.length} project{projects.length !== 1 ? 's' : ''} in {title}</Text>
      </View>

      {isError && (
        <View style={styles.errBox}>
          <Text style={styles.errTxt}>Could not load projects. Pull to retry.</Text>
        </View>
      )}

      {!isLoading && projects.length === 0 && !isError && (
        <EmptyState emoji="📋" message={`No projects currently in ${title}.`} />
      )}

      {projects.map((p) => {
        const farmerName = p.farmer
          ? `${p.farmer.first_name} ${p.farmer.last_name ?? ''}`.trim()
          : '—';
        const location = [p.village, p.district].filter(Boolean).join(', ') || '—';

        return (
          <View key={p.id} style={styles.card}>
            {/* Header row */}
            <View style={styles.cardHeader}>
              <Text style={styles.projectName} numberOfLines={1}>
                {p.project_name ?? `Project #${p.id}`}
              </Text>
              <StageChip stage={p.project_stage} />
            </View>

            {/* Detail rows */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Farmer</Text>
              <Text style={styles.detailValue}>{farmerName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{location}</Text>
            </View>
            {p.loan_amount ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Loan</Text>
                <Text style={styles.detailValue}>{formatInr(p.loan_amount)}</Text>
              </View>
            ) : null}
            {p.total_project_cost ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Project Cost</Text>
                <Text style={styles.detailValue}>{formatInr(p.total_project_cost)}</Text>
              </View>
            ) : null}
            {p.total_subsidy_amount_proposed ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Subsidy</Text>
                <Text style={[styles.detailValue, { color: '#2E7D46', fontWeight: '700' }]}>
                  {formatInr(p.total_subsidy_amount_proposed)}
                </Text>
              </View>
            ) : null}

            {/* Stage label */}
            <View style={styles.stageBadgeRow}>
              <Text style={styles.stageBadge}>{stageLabel(p.project_stage)}</Text>
              {p.project_code ? <Text style={styles.codeText}>{p.project_code}</Text> : null}
            </View>

            {/* WhatsApp farmer button */}
            {p.farmer?.phone_primary ? (
              <TouchableOpacity
                style={styles.waBtn}
                onPress={() => Linking.openURL(
                  `https://wa.me/91${p.farmer!.phone_primary}?text=Hello+${encodeURIComponent(p.farmer!.first_name)},+this+is+ICON+ERP.`
                )}
              >
                <Text style={styles.waTxt}>💬 WhatsApp {p.farmer.first_name}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: COLORS.bg },
  summaryBar:   { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: 10 },
  summaryText:  { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  errBox:       { backgroundColor: '#FFEBEE', margin: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errTxt:       { color: '#C62828', fontSize: 13, fontWeight: '600' },
  card:         { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md, elevation: 2 },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  projectName:  { fontSize: 14, fontWeight: '800', color: COLORS.text, flex: 1, marginRight: 8 },
  detailRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  detailLabel:  { fontSize: 11, color: COLORS.subtext },
  detailValue:  { fontSize: 12, fontWeight: '600', color: COLORS.text, textAlign: 'right', flex: 1, marginLeft: 8 },
  stageBadgeRow:{ flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm },
  stageBadge:   { fontSize: 11, color: COLORS.subtext, fontStyle: 'italic' },
  codeText:     { fontSize: 11, color: COLORS.subtext },
  waBtn:        { marginTop: SPACING.sm, backgroundColor: '#25D366', borderRadius: 8, padding: 8, alignItems: 'center' },
  waTxt:        { color: COLORS.white, fontWeight: '700', fontSize: 12 },
});
