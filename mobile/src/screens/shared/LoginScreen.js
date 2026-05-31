import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/UI';
import { colors, spacing, radius, font, shadow } from '../../styles/theme';

const QUICK_ROLES = [
  { label: 'Admin',         username: '9888888888', password: 'icon123', color: colors.admin,      emoji: '🛡️' },
  { label: 'Owner',         username: '9000000000', password: 'icon123', color: colors.admin,      emoji: '👑' },
  { label: 'Dealer',        username: '9777777777', password: 'icon123', color: colors.dealer,     emoji: '🤝' },
  { label: 'Office Staff',  username: '9555000001', password: 'icon123', color: colors.office,     emoji: '🗂️' },
  { label: 'Project Mgr',   username: '9555000002', password: 'icon123', color: '#7c3aed',         emoji: '📋' },
  { label: 'Bank Officer',  username: '9555000003', password: 'icon123', color: colors.bank,       emoji: '🏦' },
  { label: 'Agency Officer',username: '9555000004', password: 'icon123', color: colors.agency,     emoji: '🏛️' },
  { label: 'Farmer',        username: '9876543210', password: 'icon123', color: colors.farmer,     emoji: '🌾' },
  { label: 'Contractor',    username: '9555000005', password: 'icon123', color: colors.contractor, emoji: '🔨' },
];

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [quickLoading, setQuickLoading] = useState(null);
  const [showPass, setShowPass]     = useState(false);

  const doLogin = async (u, p, label = null) => {
    if (label) setQuickLoading(label);
    else setLoading(true);
    try {
      await login(u, p);
      // Navigation happens automatically via AuthContext → Navigator
    } catch (err) {
      const msg = err.response?.data?.detail || 'Connection failed. Is the backend server running?';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
      setQuickLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}><Text style={styles.logoText}>I</Text></View>
          <Text style={styles.brand}>ICON</Text>
          <Text style={styles.brandSub}>Greenhouse ERP</Text>
        </View>

        {/* Login card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSub}>Sign in to your ICON account</Text>

          <Input
            label="Phone Number / Username"
            value={username}
            onChangeText={setUsername}
            placeholder="e.g. 9876543210"
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passRow}>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPass}
                style={{ flex: 1, marginBottom: 0 }}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(v => !v)}>
                <Text style={{ fontSize: 18 }}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Button
            title="Sign In"
            onPress={() => doLogin(username, password)}
            loading={loading}
            disabled={!username || !password}
          />
        </View>

        {/* Quick Login tiles */}
        <View style={styles.quickSection}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Quick Login</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.tilesGrid}>
            {QUICK_ROLES.map((r) => (
              <TouchableOpacity
                key={r.label}
                style={[styles.tile, { borderColor: r.color }]}
                onPress={() => doLogin(r.username, r.password, r.label)}
                disabled={!!quickLoading || loading}
                activeOpacity={0.75}
              >
                <Text style={styles.tileEmoji}>{r.emoji}</Text>
                <Text style={[styles.tileLabel, { color: r.color }]}>
                  {quickLoading === r.label ? '…' : r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>All demo accounts: password <Text style={styles.code}>icon123</Text></Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xxl },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: {
    width: 64, height: 64, borderRadius: radius.lg,
    backgroundColor: colors.accent,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoText: { fontSize: font.xxl, fontWeight: font.bold, color: colors.white },
  brand: { fontSize: font.xxl, fontWeight: font.bold, color: colors.white },
  brandSub: { fontSize: font.base, color: colors.accent, fontWeight: font.semi },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.md,
    marginBottom: spacing.xl,
  },
  cardTitle: { fontSize: font.xl, fontWeight: font.bold, color: colors.text, marginBottom: 4 },
  cardSub: { fontSize: font.sm, color: colors.textMuted, marginBottom: spacing.lg },
  label: { fontSize: font.sm, fontWeight: font.semi, color: colors.text, marginBottom: 6 },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyeBtn: {
    padding: spacing.sm,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  quickSection: { marginBottom: spacing.xl },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  dividerText: { color: 'rgba(255,255,255,0.7)', fontSize: font.sm, marginHorizontal: spacing.sm },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  tile: {
    width: '30%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: spacing.sm,
    alignItems: 'center',
    ...shadow.sm,
  },
  tileEmoji: { fontSize: 22, marginBottom: 4 },
  tileLabel: { fontSize: font.xs, fontWeight: font.semi, textAlign: 'center' },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: font.xs, textAlign: 'center', marginTop: spacing.md },
  code: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: colors.accent },
});
