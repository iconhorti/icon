import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Network from 'expo-network';

export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (!cancelled) setOffline(state.isConnected === false);
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

  if (!offline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>📡 No internet — showing cached data</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#E65100',
    paddingVertical:  8,
    paddingHorizontal: 16,
    alignItems:      'center',
  },
  text: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
