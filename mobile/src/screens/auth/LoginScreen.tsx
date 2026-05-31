import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuthContext } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function LoginScreen() {
  const { login } = useAuthContext();
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [showPass, setShowPass]   = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !password) {
      Alert.alert('Required', 'Enter your mobile number and password.');
      return;
    }
    try {
      setLoading(true);
      await login(phone.trim(), password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message ?? 'Could not connect. Check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.logo}>🌿 ICON ERP</Text>
          <Text style={styles.subtitle}>Horticulture Project Management</Text>

          <Text style={styles.fieldLabel}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="9876543210"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            autoComplete="tel"
            maxLength={10}
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="••••••••"
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
              <Text style={styles.eyeTxt}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityLabel="Sign in"
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.btnText}>Sign In →</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:       { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
  card:         { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl, elevation: 4 },
  logo:         { fontSize: 26, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: SPACING.xs },
  subtitle:     { fontSize: 12, color: COLORS.subtext, textAlign: 'center', marginBottom: SPACING.xl },
  fieldLabel:   { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: SPACING.sm },
  input:        { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.md, fontSize: 14, marginBottom: SPACING.sm },
  passwordRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  eyeBtn:       { padding: SPACING.sm },
  eyeTxt:       { fontSize: 18 },
  btn:          { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.lg },
  btnDisabled:  { opacity: 0.6 },
  btnText:      { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
