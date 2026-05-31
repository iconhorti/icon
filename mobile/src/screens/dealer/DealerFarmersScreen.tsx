import React, { useState } from 'react';
import { ScrollView, RefreshControl, View, Text, TextInput, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useGetProjectsQuery } from '../../store/api/projectsApi';
import { ProjectRow }          from '../../components/shared/ProjectRow';
import { EmptyState }          from '../../components/shared/EmptyState';
import { OfflineBanner }       from '../../components/shared/OfflineBanner';
import { COLORS, SPACING }     from '../../constants/theme';

export default function DealerFarmersScreen({ navigation }: any) {
  const [search, setSearch]         = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, refetch } = useGetProjectsQuery({ limit: 200 });

  const projects = (data?.items ?? []).filter((p) => {
    if (!search) return true;
    const name = `${p.farmer?.first_name ?? ''} ${p.farmer?.last_name ?? ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      <OfflineBanner />
      <TextInput
        style={styles.search}
        placeholder="🔍 Search farmer…"
        value={search}
        onChangeText={setSearch}
      />
      <View style={{ paddingHorizontal: SPACING.md }}>
        {isLoading ? null : projects.length === 0 ? (
          <EmptyState emoji="👨‍🌾" message="No farmers found." />
        ) : (
          projects.map((p) => (
            <View key={p.id}>
              <ProjectRow project={p} onPress={() => navigation.navigate('DealerProjectDetail', { id: p.id })} />
              {p.farmer?.phone_primary && (
                <TouchableOpacity
                  style={styles.waBtn}
                  onPress={() =>
                    Linking.openURL(
                      `https://wa.me/91${p.farmer!.phone_primary}?text=Hello+${encodeURIComponent(p.farmer!.first_name)}`
                    )
                  }
                >
                  <Text style={styles.waTxt}>💬 WhatsApp {p.farmer!.first_name}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: { margin: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 13 },
  waBtn:  { marginHorizontal: SPACING.md, marginTop: -4, marginBottom: SPACING.sm, backgroundColor: '#25D366', borderRadius: 8, padding: 8, alignItems: 'center' },
  waTxt:  { color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center' },
});
