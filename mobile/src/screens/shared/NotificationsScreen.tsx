import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGetNotificationsQuery, useMarkReadMutation } from '../../store/api/notificationsApi';
import { EmptyState }    from '../../components/shared/EmptyState';
import { OfflineBanner } from '../../components/shared/OfflineBanner';
import { COLORS, SPACING } from '../../constants/theme';

export default function NotificationsScreen() {
  const { data: notifs = [] } = useGetNotificationsQuery();
  const [markRead]            = useMarkReadMutation();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      {notifs.length === 0
        ? <EmptyState emoji="🔔" message="No notifications yet." />
        : notifs.map((n) => (
          <TouchableOpacity
            key={n.id}
            style={[styles.item, !n.is_read && styles.unread]}
            onPress={() => { if (!n.is_read) markRead(n.id); }}
            accessibilityLabel={n.title}
          >
            <View style={[styles.dot, n.is_read && styles.dotRead]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.body} numberOfLines={2}>{n.body}</Text>
              <Text style={styles.time}>{new Date(n.created_at).toLocaleDateString('en-IN')}</Text>
            </View>
          </TouchableOpacity>
        ))
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item:    { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginBottom: 6, borderRadius: 10, padding: SPACING.md, elevation: 1, gap: SPACING.sm, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  unread:  { borderLeftColor: COLORS.primary },
  dot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 5, flexShrink: 0 },
  dotRead: { backgroundColor: '#E0E0E0' },
  title:   { fontSize: 13, fontWeight: '700', color: COLORS.text },
  body:    { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
  time:    { fontSize: 10, color: '#BDBDBD', marginTop: 4 },
});
