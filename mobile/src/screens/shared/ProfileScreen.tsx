import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuthContext }       from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuthContext();

  const confirmLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel',   style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>{user?.first_name?.[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <Text style={styles.name}>{user?.first_name ?? 'User'}</Text>
      <Text style={styles.role}>{(user?.role ?? '').replace(/_/g, ' ')}</Text>
      <Text style={styles.phone}>{user?.phone ?? ''}</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
        <Text style={styles.logoutTxt}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  avatar:    { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  avatarTxt: { color: COLORS.white, fontSize: 32, fontWeight: '800' },
  name:      { fontSize: 20, fontWeight: '800', color: COLORS.text },
  role:      { fontSize: 13, color: COLORS.subtext, textTransform: 'capitalize', marginTop: 4 },
  phone:     { fontSize: 13, color: COLORS.subtext, marginTop: 4, marginBottom: SPACING.xl },
  logoutBtn: { backgroundColor: COLORS.danger, borderRadius: RADIUS.sm, paddingHorizontal: 32, paddingVertical: 12 },
  logoutTxt: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
