import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function LoanDashboard() {
  return (
    <View style={styles.c}>
      <Text style={styles.t}>Loan Dashboard — coming in Task 6</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  t: { color: COLORS.subtext, fontSize: 14 },
});
