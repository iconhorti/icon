import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useGetProjectByIdQuery } from '../../store/api/projectsApi';
import { formatInr }              from '../../utils/format';
import { COLORS, SPACING }        from '../../constants/theme';
import type { RouteProp }         from '@react-navigation/native';
import type { LoanStackParamList } from '../../navigation/types';

export default function LoanApplicationScreen({ route }: { route: RouteProp<LoanStackParamList, 'LoanDetail'> }) {
  const { data: project, isLoading } = useGetProjectByIdQuery(route.params.id);

  if (isLoading) return <Text style={{ padding: 32, textAlign: 'center' }}>Loading…</Text>;
  if (!project)  return <Text style={{ padding: 32, textAlign: 'center' }}>Project not found.</Text>;

  const rows = [
    { label: 'Project',        value: project.project_name ?? `#${project.id}` },
    { label: 'Loan Amount',    value: formatInr(project.loan_amount) },
    { label: 'Project Cost',   value: formatInr(project.total_project_cost) },
    { label: 'Subsidy (Est.)', value: formatInr(project.total_subsidy_amount_proposed) },
    { label: 'Loan Account',   value: project.loan_account_number ?? '—' },
    { label: 'GOC Number',     value: project.goc_number ?? '—' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md }}>
      {rows.map(({ label, value }) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, padding: SPACING.md, borderRadius: 10, marginBottom: 8, elevation: 1 },
  label: { fontSize: 12, color: COLORS.subtext },
  value: { fontSize: 13, fontWeight: '700', color: COLORS.text },
});
