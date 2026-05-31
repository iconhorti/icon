import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getDealerFarmers } from '../../api/client';
import { Card, LoadingScreen, EmptyState, Button } from '../../components/UI';
import { colors, spacing, font, radius } from '../../styles/theme';

export default function DealerFarmerList({ navigation }) {
  const { user } = useAuth();
  const [farmers, setFarmers]       = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getDealerFarmers(user.id);
      const list = data.farmers || [];
      setFarmers(list);
      setFiltered(list);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q
      ? farmers.filter(f =>
          `${f.first_name} ${f.last_name}`.toLowerCase().includes(q) ||
          f.phone_primary?.includes(q))
      : farmers);
  }, [search, farmers]);

  if (loading) return <LoadingScreen message="Loading farmers…" />;

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          placeholder="Search by name or phone…"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.textLight}
        />
        <Button
          title="+ Register"
          onPress={() => navigation.navigate('RegisterFarmer')}
          style={styles.addBtn}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={
          <EmptyState
            icon="🌾"
            message="No farmers registered yet."
            action="Register First Farmer"
            onAction={() => navigation.navigate('RegisterFarmer')}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.farmerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.first_name?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.farmerName}>{item.first_name} {item.last_name}</Text>
              <Text style={styles.farmerPhone}>📞 {item.phone_primary}</Text>
              {item.village && <Text style={styles.farmerVillage}>📍 {item.village}</Text>}
            </View>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => navigation.navigate('DocumentUpload', {
                projectId: null,
                farmerId: item.id,
                category: 'KYC',
              })}
            >
              <Text style={{ fontSize: 20 }}>📤</Text>
            </TouchableOpacity>
          </Card>
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
  farmerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: colors.white, fontSize: font.lg, fontWeight: font.bold },
  farmerName: { fontSize: font.base, fontWeight: font.semi, color: colors.text },
  farmerPhone: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  farmerVillage: { fontSize: font.xs, color: colors.textLight, marginTop: 2 },
  uploadBtn: { padding: spacing.sm },
});
