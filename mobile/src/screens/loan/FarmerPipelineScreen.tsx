import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useGetProjectsQuery } from '../../store/api/projectsApi';
import { ProjectRow }          from '../../components/shared/ProjectRow';
import { OfflineBanner }       from '../../components/shared/OfflineBanner';
import { EmptyState }          from '../../components/shared/EmptyState';
import { COLORS, SPACING }     from '../../constants/theme';
import type { FarmerPipelineScreenProps } from '../../navigation/types';

const STAGE_FILTERS = [
  { label: 'All',        value: '' },
  { label: 'Bank',       value: 'bank_processing' },
  { label: 'GOC',        value: 'goc_registration' },
  { label: 'Subsidy',    value: 'subsidy_claim' },
  { label: 'Inspection', value: 'agency_inspection' },
];

export default function FarmerPipelineScreen({ navigation, route }: FarmerPipelineScreenProps) {
  // LoanDashboard's KPI cards tap-through with an initialStage param so the
  // pipeline opens pre-filtered — this was previously ignored entirely.
  const [stageFilter, setStageFilter] = useState(route.params?.initialStage ?? '');
  const [search, setSearch]           = useState('');
  const [refreshing, setRefreshing]   = useState(false);
  const { data, isLoading, isError, isFetching, refetch } = useGetProjectsQuery({ stage: stageFilter || undefined, limit: 100 });

  const projects = (data?.items ?? []).filter((p) => {
    if (!search) return true;
    const name   = (p.project_name ?? '').toLowerCase();
    const farmer = `${p.farmer?.first_name ?? ''} ${p.farmer?.last_name ?? ''}`.toLowerCase();
    const query  = search.toLowerCase();
    return name.includes(query) || farmer.includes(query);
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
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
      <TextInput
        style={styles.search}
        placeholder="🔍 Search farmer or project…"
        value={search}
        onChangeText={setSearch}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {STAGE_FILTERS.map(({ label, value }) => (
          <TouchableOpacity
            key={value}
            style={[styles.chip, stageFilter === value && styles.chipActive]}
            onPress={() => setStageFilter(value)}
          >
            <Text style={[styles.chipTxt, stageFilter === value && styles.chipTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: SPACING.md }}>
        {isLoading ? (
          <Text style={styles.loading}>Loading…</Text>
        ) : projects.length === 0 ? (
          <EmptyState emoji="📭" message="No projects found." />
        ) : (
          projects.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              onPress={() => navigation.navigate('LoanDetail', { id: p.id })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search:        { margin: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 13 },
  chipScroll:    { paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  chip:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8 },
  chipActive:    { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  chipTxt:       { fontSize: 11, fontWeight: '600', color: COLORS.subtext },
  chipTxtActive: { color: COLORS.white },
  loading:       { textAlign: 'center', color: COLORS.subtext, padding: 32 },
  errorBanner:   { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:     { color: '#C62828', fontSize: 13, fontWeight: '600' },
});
