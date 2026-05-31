import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, StyleSheet } from 'react-native';
import { useGetStatsQuery }        from '../../store/api/dashboardApi';
import { STAGE_ORDER, stageLabel } from '../../constants/stages';
import { COLORS, SPACING }         from '../../constants/theme';

const GROUP_MAP: Record<string, string> = {
  draft:                 'Onboarding',
  farmer_onboarding:     'Onboarding',
  document_collection:   'Onboarding',
  site_visit:            'Planning',
  design_boq:            'Planning',
  dpr_ready:             'Planning',
  bank_processing:       'Financial',
  goc_registration:      'Financial',
  m1_foundation:         'Construction',
  m2_structure_erection: 'Construction',
  m3_covering_material:  'Construction',
  m4_trellising:         'Construction',
  m5_drip_fitting:       'Construction',
  m6_bed_preparation:    'Construction',
  m7_plantation:         'Construction',
  subsidy_claim:         'Subsidy',
  agency_inspection:     'Subsidy',
  committee_meeting:     'Subsidy',
  subsidy_released:      'Subsidy',
  completed:             'Done',
};

export default function FarmerTimelineScreen() {
  const { data: stats, isError, isFetching, refetch } = useGetStatsQuery();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const currentStage = stats?.my_project?.project_stage ?? '';
  const currIdx      = STAGE_ORDER.indexOf(currentStage);

  let lastGroup = '';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.bg, padding: SPACING.md }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || isFetching}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ Could not load data. Pull down to retry.</Text>
        </View>
      )}
      {STAGE_ORDER.map((slug, idx) => {
        const group     = GROUP_MAP[slug] ?? '';
        const done      = idx < currIdx;
        const current   = idx === currIdx;
        const showGroup = group !== lastGroup;
        if (showGroup) lastGroup = group;

        return (
          <React.Fragment key={slug}>
            {showGroup && <Text style={styles.group}>{group}</Text>}
            <View style={styles.step}>
              <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent]}>
                <Text style={styles.dotTxt}>{done ? '✓' : String(idx + 1)}</Text>
              </View>
              <Text style={[styles.label, done && styles.labelDone, current && styles.labelCurrent]}>
                {stageLabel(slug)}
              </Text>
              {current && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>Current</Text>
                </View>
              )}
            </View>
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  group:        { fontSize: 10, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  step:         { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  dot:          { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dotDone:      { backgroundColor: COLORS.primary },
  dotCurrent:   { backgroundColor: '#E65100' },
  dotTxt:       { fontSize: 10, fontWeight: '800', color: COLORS.white },
  label:        { flex: 1, fontSize: 13, color: '#BDBDBD' },
  labelDone:    { color: COLORS.subtext },
  labelCurrent: { color: '#E65100', fontWeight: '700' },
  badge:        { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeTxt:     { fontSize: 10, fontWeight: '700', color: '#E65100' },
  errorBanner:  { backgroundColor: '#FFEBEE', margin: 12, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#C62828' },
  errorText:    { color: '#C62828', fontSize: 13, fontWeight: '600' },
});
