import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StaleBannerProps { label: string | null; }

export const StaleBanner: React.FC<StaleBannerProps> = ({ label }) => {
  if (!label) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Showing cached data · Last updated {label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: { backgroundColor: '#FFF8E1', paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center' },
  text:   { color: '#F57F17', fontSize: 11, fontWeight: '600' },
});
