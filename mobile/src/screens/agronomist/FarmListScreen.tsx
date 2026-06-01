import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useGetFarmsQuery } from '../../store/api/agronomistApi';
import { EmptyState }       from '../../components/shared/EmptyState';
import { OfflineBanner }    from '../../components/shared/OfflineBanner';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import type { NavigationProp } from '@react-navigation/native';

const PURPLE = '#6A1B9A';

export default function FarmListScreen({ navigation }: { navigation: NavigationProp<any> }) {
  const { data: farms = [], isLoading } = useGetFarmsQuery();
  const [search, setSearch] = useState('');
  const filtered = farms.filter(f => !search || f.farmer_name.toLowerCase().includes(search.toLowerCase()) || f.village.toLowerCase().includes(search.toLowerCase()));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      <TextInput style={styles.search} placeholder="Search farmer or village..." value={search} onChangeText={setSearch} />
      <View style={{ paddingHorizontal: SPACING.md }}>
        {isLoading ? null : filtered.length === 0 ? <EmptyState emoji="🌾" message="No farms found." /> : filtered.map(f => (
          <TouchableOpacity key={f.id} style={styles.farmCard} onPress={() => navigation.navigate('IoT', { farmId: f.id })}>
            <View style={styles.farmHeader}>
              <Text style={styles.farmName}>{f.farmer_name}</Text>
              {f.alert_level !== 'none' && (
                <Text style={[styles.alertBadge, f.alert_level === 'critical' && styles.alertBadgeCrit]}>
                  {f.alert_level === 'critical' ? 'Critical' : 'Warning'}
                </Text>
              )}
            </View>
            <Text style={styles.farmSub}>{f.village} · {f.crop_type} · {f.dap} DAP · {f.area_acres} Acres</Text>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${Math.min(100, Math.round(f.dap / 1.2))}%` as any }]} />
            </View>
            <Text style={styles.progressLabel}>{f.dap} / ~120 days</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search:         { margin: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 13 },
  farmCard:       { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, elevation: 1 },
  farmHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  farmName:       { fontSize: 14, fontWeight: '700', color: COLORS.text },
  alertBadge:     { fontSize: 10, fontWeight: '700', color: '#E65100', backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  alertBadgeCrit: { color: '#C62828', backgroundColor: '#FFEBEE' },
  farmSub:        { fontSize: 11, color: COLORS.subtext, marginBottom: SPACING.sm },
  progressBg:     { height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  progressFill:   { height: '100%', backgroundColor: PURPLE },
  progressLabel:  { fontSize: 10, color: COLORS.subtext, marginTop: 3, textAlign: 'right' },
});
