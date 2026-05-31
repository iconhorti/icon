import React from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useGetProjectByIdQuery } from '../../store/api/projectsApi';
import { StageChip }              from '../../components/shared/StageChip';
import { OfflineBanner }          from '../../components/shared/OfflineBanner';
import { formatInr, formatDate }  from '../../utils/format';
import { stageProgress }          from '../../constants/stages';
import { COLORS, SPACING }        from '../../constants/theme';

export default function ProjectDetailScreen({ route }: any) {
  const id = route.params?.id as number;
  const { data: project, isLoading, isError } = useGetProjectByIdQuery(id ?? 0, { skip: !id });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isError || !project) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTxt}>Project not found.</Text>
      </View>
    );
  }

  const pct = stageProgress(project.project_stage);

  const sections: Array<{ title: string; rows: Array<{ label: string; value: string }> }> = [
    {
      title: 'Status',
      rows: [
        { label: 'Stage',        value: project.project_stage.replace(/_/g, ' ') },
        { label: 'Progress',     value: `${pct}%` },
        { label: 'Project Code', value: project.project_code ?? '—' },
        { label: 'Registered',   value: formatDate(project.created_at) },
      ],
    },
    {
      title: 'Stakeholders',
      rows: [
        { label: 'Farmer',   value: project.farmer ? `${project.farmer.first_name} ${project.farmer.last_name ?? ''}`.trim() : '—' },
        { label: 'Village',  value: project.village  ?? '—' },
        { label: 'District', value: project.district ?? '—' },
      ],
    },
    {
      title: 'Financials',
      rows: [
        { label: 'Project Cost',   value: formatInr(project.total_project_cost) },
        { label: 'Subsidy (Est.)', value: formatInr(project.total_subsidy_amount_proposed) },
        { label: 'Loan Amount',    value: formatInr(project.loan_amount) },
        { label: 'Loan Account',   value: project.loan_account_number ?? '—' },
        { label: 'GOC Number',     value: project.goc_number ?? '—' },
      ],
    },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OfflineBanner />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.projectName} numberOfLines={2}>
          {project.project_name ?? `Project #${project.id}`}
        </Text>
        <View style={{ marginTop: SPACING.sm }}>
          <StageChip stage={project.project_stage} />
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressPct}>{pct}%</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>
      </View>

      {/* Data sections */}
      {sections.map((section) => (
        <View key={section.title}>
          <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
          <View style={styles.card}>
            {section.rows.map(({ label, value }) => (
              <View key={label} style={styles.row}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  errorTxt:      { color: COLORS.subtext, fontSize: 14 },
  header:        { backgroundColor: COLORS.primary, padding: SPACING.lg },
  projectName:   { fontSize: 18, fontWeight: '800', color: COLORS.white },
  progressCard:  { backgroundColor: COLORS.white, margin: SPACING.md, borderRadius: 12, padding: SPACING.md, elevation: 1 },
  progressRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressLabel: { fontSize: 12, color: COLORS.subtext, fontWeight: '600' },
  progressPct:   { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  progressBg:    { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: COLORS.primary, borderRadius: 5 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: SPACING.md, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  card:          { backgroundColor: COLORS.white, marginHorizontal: SPACING.md, borderRadius: 12, padding: SPACING.md, elevation: 1 },
  row:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  rowLabel:      { fontSize: 12, color: COLORS.subtext, flex: 1 },
  rowValue:      { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1, textAlign: 'right' },
});
