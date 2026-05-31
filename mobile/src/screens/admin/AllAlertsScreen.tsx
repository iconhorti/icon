import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, StyleSheet } from 'react-native';
import { useGetNotificationsQuery } from '../../store/api/notificationsApi';
import { EmptyState }               from '../../components/shared/EmptyState';
import { OfflineBanner }            from '../../components/shared/OfflineBanner';
import { COLORS, SPACING }          from '../../constants/theme';

export default function AllAlertsScreen() {
  const [refreshing, setRefreshing]                        = useState(false);
  const { data: notifs = [], isError, isFetching, refetch } = useGetNotificationsQuery();

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
      {notifs.length === 0
        ? <EmptyState emoji="🔕" message="No system alerts." />
        : notifs.map((n) => (
          <View key={n.id} style={[styles.item, !n.is_read && styles.unread]}>
            <Text style={styles.title}>{n.title}</Text>
            <Text style={styles.body} numberOfLines={2}>{n.body}</Text>
            <Text style={styles.time}>{new Date(n.created_at).toLocaleDateString('en-IN')}</Text>
          </View>
        ))
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item:        { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  unread:      { borderLeftColor: '#C8972A' },
  title:       { fontSize: 13, fontWeight: '700', color: COLORS.text },
  body:        { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  time:        { fontSize: 10, color: '#BDBDBD', marginTop: 4 },
  errorBanner: { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:   { color: '#C62828', fontSize: 13, fontWeight: '600' },
});
