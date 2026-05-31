import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

interface Props { role?: string; }

export default function AccessDeniedScreen({ role }: Props) {
  return (
    <View style={styles.c}>
      <Text style={styles.emoji}>🔒</Text>
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.sub}>
        Role "{role ?? 'unknown'}" has no dashboard assigned.{'\n'}Contact your administrator.
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, padding: 32 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  sub:   { fontSize: 13, color: COLORS.subtext, textAlign: 'center', lineHeight: 20 },
});
