import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Card, Button } from '../../components/UI';
import { colors, spacing, font, radius } from '../../styles/theme';

const ROLE_EMOJI = {
  admin: '🛡️', owner: '👑', dealer: '🤝', office_staff: '🗂️',
  project_manager: '📋', bank_officer: '🏦', agency_officer: '🏛️',
  farmer: '🌾', structure_contractor: '🔨', drip_contractor: '💧',
  bed_contractor: '🌱', plantation_contractor: '🌿', agronomist: '🌿',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const confirmLogout = () =>
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{ROLE_EMOJI[user?.role] || '👤'}</Text>
      </View>
      <Text style={styles.name}>{user?.first_name || 'User'}</Text>
      <Text style={styles.role}>{user?.role?.replace(/_/g, ' ').toUpperCase()}</Text>

      <Card style={{ marginTop: spacing.xl }}>
        <Row label="Name"  value={user?.first_name} />
        <Row label="Role"  value={user?.role?.replace(/_/g, ' ')} />
        <Row label="ID"    value={`#${user?.id}`} />
      </Card>

      <Button
        title="Sign Out"
        variant="danger"
        onPress={confirmLogout}
        style={{ marginTop: spacing.md }}
      />
    </ScrollView>
  );
}

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.xxl, alignItems: 'center' },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 36 },
  name: { fontSize: font.xl, fontWeight: font.bold, color: colors.text },
  role: { fontSize: font.sm, color: colors.textMuted, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: font.sm, color: colors.textMuted },
  rowValue: { fontSize: font.sm, fontWeight: font.semi, color: colors.text },
});
