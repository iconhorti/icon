import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function UserManagementScreen() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>User Management — coming in Task 6</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  t: { color: COLORS.subtext, fontSize: 14 },
});
