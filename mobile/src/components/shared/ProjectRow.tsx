import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Project } from '../../store/api/projectsApi';
import { StageChip } from './StageChip';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface ProjectRowProps {
  project: Project;
  onPress: (project: Project) => void;
}

export const ProjectRow: React.FC<ProjectRowProps> = ({ project, onPress }) => {
  const farmerName = project.farmer
    ? `${project.farmer.first_name} ${project.farmer.last_name ?? ''}`.trim()
    : '—';
  const location = project.village ?? project.district ?? '';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(project)}
      accessibilityLabel={`Project ${project.project_name ?? project.id}`}
    >
      <View style={styles.iconBox}>
        <Text style={{ fontSize: 18 }}>🏗️</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {project.project_name ?? `Project #${project.id}`}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {farmerName}{location ? ` · ${location}` : ''}
        </Text>
      </View>
      <StageChip stage={project.project_stage} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row:     {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: COLORS.white,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    marginBottom:    SPACING.sm,
    elevation:       1,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.08,
    shadowRadius:    2,
  },
  iconBox: {
    width:           36,
    height:          36,
    borderRadius:    10,
    backgroundColor: '#E8F5E9',
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     SPACING.md,
    flexShrink:      0,
  },
  body: { flex: 1 },
  name: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  sub:  { fontSize: 11, color: COLORS.subtext, marginTop: 2 },
});
