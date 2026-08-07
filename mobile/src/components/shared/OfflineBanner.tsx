import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Network from 'expo-network';
import { queueCount } from '../../db/syncQueue';

export const OfflineBanner: React.FC = () => {
  const [offline, setOffline]       = useState(false);
  const [pendingCount, setPending]  = useState(0);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const [state, count] = await Promise.all([
          Network.getNetworkStateAsync(),
          queueCount(),
        ]);
        if (!cancelled) {
          setOffline(state.isConnected === false);
          setPending(count);
        }
      } catch {
        // Network module unavailable (simulator) — assume online
      }
    };

    check();
    const interval = setInterval(check, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!offline && pendingCount === 0) return null;

  const message = offline
    ? '📡 No internet — changes will sync when you reconnect'
    : `⏳ ${pendingCount} offline ${pendingCount === 1 ? 'write' : 'writes'} waiting to upload`;

  return (
    <View style={[styles.banner, offline ? styles.offline : styles.pending]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingVertical:   8,
    paddingHorizontal: 16,
    alignItems:        'center',
  },
  offline: { backgroundColor: '#E65100' },
  pending: { backgroundColor: '#1565C0' },
  text:    { color: '#fff', fontSize: 12, fontWeight: '600' },
});
