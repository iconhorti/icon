import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface ConfigItem { label: string; value: string; note?: string; }
interface ConfigSection { title: string; emoji: string; items: ConfigItem[]; }

const CONFIG_SECTIONS: ConfigSection[] = [
  {
    title: 'Authentication', emoji: '🔐',
    items: [
      { label: 'Session Timeout',    value: '30 minutes',   note: 'Auto-lock after inactivity' },
      { label: 'Token Expiry',       value: '8 hours',      note: 'Full re-auth required after' },
      { label: 'Refresh Token',      value: '30 days' },
      { label: 'Biometric Unlock',   value: 'Enabled',      note: 'Fingerprint / Face ID' },
      { label: 'Single Device Login', value: 'Enforced',    note: '2nd login logs out 1st device' },
    ],
  },
  {
    title: 'Approval Thresholds', emoji: '💰',
    items: [
      { label: 'Auto-approve limit',   value: '₹0',          note: 'All amounts need approval' },
      { label: 'PM approval limit',    value: 'Up to ₹1 L' },
      { label: 'Accounts co-approval', value: 'Above ₹1 L' },
      { label: 'Owner approval',       value: 'Above ₹5 L' },
      { label: 'Biometric re-auth',    value: 'Above ₹50,000', note: 'Required for approval action' },
    ],
  },
  {
    title: 'IoT Alert Thresholds', emoji: '🌡️',
    items: [
      { label: 'Temperature — Warning',  value: '35 °C' },
      { label: 'Temperature — Critical', value: '38 °C',  note: 'Fan-pad auto-activated' },
      { label: 'Humidity — Warning',     value: '85%' },
      { label: 'Soil Moisture — Low',    value: '25%',   note: 'Drip scheduling adjusted' },
      { label: 'WebSocket Refresh',      value: '60 s' },
    ],
  },
  {
    title: 'Notifications', emoji: '🔔',
    items: [
      { label: 'Push Provider',        value: 'Firebase FCM' },
      { label: 'Critical channel',     value: 'Bypasses DND', note: 'SLA breach, IoT critical' },
      { label: 'KYC expiry alert',     value: '7 days before' },
      { label: 'Daily digest',         value: '8:00 AM',     note: 'Overnight alerts summary' },
    ],
  },
  {
    title: 'Data & Sync', emoji: '🔄',
    items: [
      { label: 'Dashboard refresh',    value: 'Every 5 min',  note: 'When app in foreground' },
      { label: 'Offline form save',    value: '< 500 ms',     note: 'Local SQLite — no network needed' },
      { label: 'Photo upload queue',   value: 'WiFi / 4G',    note: 'Progress indicator shown' },
      { label: 'App package size',     value: '< 50 MB' },
      { label: 'OTA updates',          value: 'Expo EAS',     note: 'No Play Store submission for JS updates' },
    ],
  },
];

export default function SystemConfigScreen() {
  return (
    <ScrollView style={styles.screen}>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {'ℹ️'} System configuration is managed by the Owner via the ICON web portal.
          Changes made there take effect immediately across all users.
        </Text>
      </View>
      {CONFIG_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.emoji} {section.title.toUpperCase()}</Text>
          <View style={styles.card}>
            {section.items.map((item, idx) => (
              <View
                key={item.label}
                style={[styles.row, idx < section.items.length - 1 && styles.rowBorder]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{item.label}</Text>
                  {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
                </View>
                <Text style={styles.value}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: COLORS.bg },
  infoBox:      { backgroundColor: '#E3F2FD', margin: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, borderLeftWidth: 3, borderLeftColor: '#1565C0' },
  infoText:     { fontSize: 12, color: '#1565C0', lineHeight: 18 },
  section:      { marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: COLORS.subtext, letterSpacing: 0.6, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  card:         { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, borderRadius: RADIUS.md, elevation: 1 },
  row:          { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  rowBorder:    { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  label:        { fontSize: 13, color: COLORS.text, fontWeight: '500', flex: 1 },
  note:         { fontSize: 10, color: COLORS.subtext, marginTop: 2 },
  value:        { fontSize: 13, fontWeight: '700', color: COLORS.primary, textAlign: 'right', marginLeft: SPACING.sm },
});
