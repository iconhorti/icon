import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, TextInput, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useGetProjectsQuery } from '../../store/api/projectsApi';
import { ProjectRow }          from '../../components/shared/ProjectRow';
import { EmptyState }          from '../../components/shared/EmptyState';
import { OfflineBanner }       from '../../components/shared/OfflineBanner';
import { COLORS, SPACING }     from '../../constants/theme';
import type { NavigationProp } from '@react-navigation/native';

export default function DealerFarmersScreen({ navigation }: { navigation: NavigationProp<any> }) {
  const [search, setSearch]         = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, isError, isFetching, refetch } = useGetProjectsQuery({ limit: 200 });

  const projects = (data?.items ?? []).filter((p) => {
    if (!search) return true;
    const name = `${p.farmer?.first_name ?? ''} ${p.farmer?.last_name ?? ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
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
  search:      { margin: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.white, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 13 },
  waBtn:       { marginHorizontal: SPACING.md, marginTop: -4, marginBottom: SPACING.sm, backgroundColor: '#25D366', borderRadius: 8, padding: 8, alignItems: 'center' },
  waTxt:       { color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  errorBanner: { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:   { color: '#C62828', fontSize: 13, fontWeight: '600' },
});
