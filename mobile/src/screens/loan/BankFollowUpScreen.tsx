import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useGetProjectsQuery } from '../../store/api/projectsApi';
import { EmptyState }          from '../../components/shared/EmptyState';
import { OfflineBanner }       from '../../components/shared/OfflineBanner';
import { COLORS, SPACING }     from '../../constants/theme';

export default function BankFollowUpScreen() {
  const { data } = useGetProjectsQuery({ stage: 'bank_processing', limit: 50 });
  const projects = data?.items ?? [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />
      {projects.length === 0
        ? <EmptyState emoji="📞" message="No bank follow-ups required today." />
        : projects.map((p) => (
          <View key={p.id} style={styles.item}>
            <Text style={styles.emoji}>🏦</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{p.project_name ?? `Project #${p.id}`}</Text>
              <Text style={styles.sub}>{p.farmer?.first_name ?? '—'} · Bank Processing</Text>
            </View>
            {p.farmer?.phone_primary && (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${p.farmer!.phone_primary}`)}
              >
                <Text style={styles.callTxt}>📞 Call</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item:    { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, margin: SPACING.md, marginBottom: 0, borderRadius: 12, padding: SPACING.md, elevation: 1, gap: SPACING.md },
  emoji:   { fontSize: 22 },
  name:    { fontSize: 13, fontWeight: '700', color: COLORS.text },
  sub:     { fontSize: 11, color: COLORS.subtext },
  callBtn: { backgroundColor: '#1565C0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  callTxt: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
});
