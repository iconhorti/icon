import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, RefreshControl, TouchableOpacity,
} from 'react-native';
import { getProjects } from '../../api/client';
import { Card, StageBadge, LoadingScreen, EmptyState } from '../../components/UI';
import { colors, spacing, font, radius } from '../../styles/theme';

const STAGE_FILTERS = [
  { label: 'All',           value: null },
  { label: 'Onboarding',    value: 'farmer_onboarding' },
  { label: 'Documents',     value: 'document_collection' },
  { label: 'Bank',          value: 'bank_processing' },
  { label: 'Construction',  value: 'm1_foundation' },
  { label: 'Subsidy',       value: 'subsidy_claim' },
  { label: 'Completed',     value: 'completed' },
];

export default function ProjectList({ navigation }) {
  const [projects, setProjects]     = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [search,   setSearch]       = useState('');
  const [stage,    setStage]        = useState(null);
  const [loading,  setLoading]      = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getProjects({ limit: 200 });
      setProjects(data || []);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let list = projects;
    if (stage) list = list.filter(p => p.project_stage === stage);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.project_code?.toLowerCase().includes(q) ||
        p.farmer?.first_name?.toLowerCase().includes(q) ||
        p.farmer?.phone_primary?.includes(q));
    }
    setFiltered(list);
  }, [projects, stage, search]);

  if (loading) return <LoadingScreen message="Loading projects…" />;

  return (
    <View style={styles.screen}>
      {/* Search bar */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Search farmer, code…"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.textLight}
        />
        <Text style={styles.count}>{filtered.length}</Text>
      </View>

      {/* Stage filter chips */}
      <FlatList
        horizontal
        data={STAGE_FILTERS}
        keyExtractor={i => i.label}
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, stage === item.value && styles.filterChipActive]}
            onPress={() => setStage(item.value)}
          >
            <Text style={[styles.filterText, stage === item.value && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Project list */}
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={<EmptyState icon="📁" message="No projects match your filter." />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}>
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.code}>{item.project_code || `#${item.id}`}</Text>
                <StageBadge stage={item.project_stage} />
              </View>
              <Text style={styles.farmer}>
                🌾 {item.farmer?.first_name} {item.farmer?.last_name || ''}
              </Text>
              <View style={styles.cardBottom}>
                {item.dealer && <Text style={styles.meta}>🤝 {item.dealer.first_name}</Text>}
                {item.area_type && <Text style={styles.meta}>📐 {item.area_type.name}</Text>}
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, backgroundColor: colors.card,
  },
  search: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
    paddingVertical: 10, fontSize: font.sm, color: colors.text,
  },
  count: { fontSize: font.base, fontWeight: font.bold, color: colors.primary },
  filterBar: { backgroundColor: colors.card, paddingVertical: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  filterText: { fontSize: font.sm, color: colors.textMuted },
  filterTextActive: { color: colors.primary, fontWeight: font.semi },
  card: { marginBottom: spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  code: { fontSize: font.base, fontWeight: font.bold, color: colors.text },
  farmer: { fontSize: font.base, color: colors.text, marginBottom: 4 },
  cardBottom: { flexDirection: 'row', gap: spacing.md },
  meta: { fontSize: font.xs, color: colors.textMuted },
});
