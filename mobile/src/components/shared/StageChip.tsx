import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { stageLabel } from '../../constants/stages';

interface ChipColor { bg: string; text: string; }

const CHIP_MAP: Record<string, ChipColor> = {
  completed:          { bg: '#E8F5E9', text: '#2E7D46' },
  subsidy_released:   { bg: '#E8F5E9', text: '#2E7D46' },
  bank_processing:    { bg: '#FFF3E0', text: '#E65100' },
  goc_registration:   { bg: '#FFF3E0', text: '#E65100' },
  agency_inspection:  { bg: '#E3F2FD', text: '#1565C0' },
  committee_meeting:  { bg: '#E3F2FD', text: '#1565C0' },
  subsidy_claim:      { bg: '#E3F2FD', text: '#1565C0' },
};
const DEFAULT_CHIP: ChipColor = { bg: '#EDE7F6', text: '#6A1B9A' };

interface StageChipProps { stage: string; }

export const StageChip: React.FC<StageChipProps> = ({ stage }) => {
  const colors = CHIP_MAP[stage] ?? DEFAULT_CHIP;
  return (
    <View style={[styles.chip, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.text }]}>{stageLabel(stage)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  label: { fontSize: 10, fontWeight: '700' },
});
