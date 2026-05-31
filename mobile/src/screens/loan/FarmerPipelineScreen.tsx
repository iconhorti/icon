import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useGetProjectsQuery } from '../../store/api/projectsApi';
import { ProjectRow }          from '../../components/shared/ProjectRow';
import { OfflineBanner }       from '../../components/shared/OfflineBanner';
import { EmptyState }          from '../../components/shared/EmptyState';
import { COLORS, SPACING }     from '../../constants/theme';

const STAGE_FILTERS = [
  { label: 'All',        value: '' },
  { label: 'Bank',       value: 'bank_processing' },
  { label: 'GOC',        value: 'goc_registration' },
  { label: 'Subsidy',    value: 'subsidy_claim' },
  { label: 'Inspection', value: 'agency_inspection' },
];

export default function FarmerPipelineScreen({ navigation }: any) {
  const [stageFilter, setStageFilter] = useState('');
  const [search, setSearch]           = useState('');
  const { data, isLoading }           = useGetProjectsQuery({ stage: stageFilter || undefined, limit: 100 });

  const projects = (data?.items ?? []).filter((p) => {
    if (!search) return true;
    const name   = (p.project_name ?? '').toLowerCase();
    const farmer = `${p.farmer?.first_name ?? ''} ${p.farmer?.last_name ?? ''}`.toLowerCase();
    const query  = search.toLowerCase();
    return name.includes(query) || farmer.includes(query);
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
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
});
