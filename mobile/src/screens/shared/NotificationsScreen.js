import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { getMyNotifications, markNotificationRead } from '../../api/client';
import { Card, LoadingScreen, EmptyState } from '../../components/UI';
import { colors, spacing, font } from '../../styles/theme';

export default function NotificationsScreen() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getMyNotifications();
      setItems(data.notifications || []);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await markNotificationRead(id);
      setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (_) {}
  };

  if (loading) return <LoadingScreen message="Loading notifications…" />;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={<EmptyState icon="🔔" message="No notifications yet." />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => !item.is_read && markRead(item.id)}>
            <Card style={[styles.notif, !item.is_read && styles.unread]}>
              <View style={styles.notifRow}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                {!item.is_read && <View style={styles.dot} />}
              </View>
              <Text style={styles.notifMsg}>{item.message}</Text>
              <Text style={styles.notifTime}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
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
  header: { backgroundColor: colors.primary, padding: spacing.lg, paddingTop: spacing.xl },
  title: { color: colors.white, fontSize: font.xl, fontWeight: font.bold },
  notif: { marginBottom: spacing.sm },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { fontSize: font.base, fontWeight: font.semi, color: colors.text, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  notifMsg: { fontSize: font.sm, color: colors.textMuted, marginTop: 4 },
  notifTime: { fontSize: font.xs, color: colors.textLight, marginTop: 6 },
});
