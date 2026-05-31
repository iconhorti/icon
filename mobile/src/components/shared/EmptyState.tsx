import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

interface EmptyStateProps {
  emoji?:   string;
  message:  string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ emoji = '📭', message }) => (
  <View style={styles.container}>
    <Text style={styles.emoji}>{emoji}</Text>
    <Text style={styles.message}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji:     { fontSize: 40, marginBottom: 12 },
  message:   { color: COLORS.subtext, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
