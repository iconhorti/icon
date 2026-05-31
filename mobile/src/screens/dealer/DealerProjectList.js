import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, RefreshControl, TouchableOpacity,
} from 'react-native';
import { getProjects } from '../../api/client';
import { Card, StageBadge, LoadingScreen, EmptyState, Button } from '../../components/UI';
import { colors, spacing, font, radius } from '../../styles/theme';

export default function DealerProjectList({ navigation }) {
  const [projects, setProjects]     = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getProjects({ limit: 100 });
      setProjects(data || []);
      setFiltered(data || []);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q
      ? projects.filter(p =>
          p.project_code?.toLowerCase().includes(q) ||
          p.farmer?.first_name?.toLowerCase().includes(q) ||
          p.project_stage?.toLowerCase().includes(q))
      : projects);
  }, [search, projects]);

  if (loading) return <LoadingScreen message="Loading projects…" />;

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Search projects…"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.textLight}
        />
        <Button
          title="+ New"
          onPress={() => navigation.navigate('CreateProject')}
          style={styles.addBtn}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={
          <EmptyState icon="📁" message="No projects yet." action="Create First Project"
            onAction={() => navigation.navigate('CreateProject')} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('DocumentUpload', { projectId: item.id })}>
            <Card style={styles.projectCard}>
              <View style={styles.projectTop}>
                <Text style={styles.code}>{item.project_code || `PRJ-${item.id}`}</Text>
                <StageBadge stage={item.project_stage} />
              </View>
              <Text style={styles.farmerName}>
                🌾 {item.farmer?.first_name} {item.farmer?.last_name || ''}
              </Text>
              {item.area_type && (
                <Text style={styles.detail}>📐 {item.area_type.name}</Text>
              )}
              <Text style={styles.detail}>
                🗓️ {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
              </Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, backgroundColor: colors.card },
  search: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
    paddingVertical: 10, fontSize: font.sm, color: colors.text,
  },
  addBtn: { paddingHorizontal: spacing.md, paddingVertical: 10 },
  projectCard: { marginBottom: spacing.sm },
  projectTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  code: { fontSize: font.base, fontWeight: font.bold, color: colors.text },
  farmerName: { fontSize: font.base, color: colors.text, marginBottom: 4 },
  detail: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
});
