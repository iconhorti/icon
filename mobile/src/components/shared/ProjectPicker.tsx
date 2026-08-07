import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useGetProjectsQuery, type Project } from '../../store/api/projectsApi';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface Props {
  value: number | null;
  onChange: (project: Project) => void;
  label?: string;
  stageFilter?: string[];
  accent?: string;
}

export function ProjectPicker({ value, onChange, label = 'Project', stageFilter, accent = COLORS.primary }: Props) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useGetProjectsQuery({ limit: 100 });
  const items = (data?.items ?? []).filter((p) =>
    !stageFilter?.length || stageFilter.includes(p.project_stage),
  );
  const selected = items.find((p) => p.id === value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label} *</Text>
      <TouchableOpacity style={[styles.btn, { borderColor: accent }]} onPress={() => setOpen(true)}>
        <Text style={styles.btnTxt} numberOfLines={1}>
          {selected
            ? `${selected.project_code ?? selected.id} — ${selected.farmer?.first_name ?? selected.project_name ?? 'Project'}`
            : 'Select a project…'}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Project</Text>
            {isLoading ? (
              <ActivityIndicator color={accent} style={{ marginVertical: SPACING.lg }} />
            ) : (
              <FlatList
                data={items}
                keyExtractor={(p) => String(p.id)}
                ListEmptyComponent={<Text style={styles.empty}>No projects available.</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.row, item.id === value && { backgroundColor: '#F1F8E9' }]}
                    onPress={() => { onChange(item); setOpen(false); }}
                  >
                    <Text style={styles.rowTitle}>{item.project_code ?? `#${item.id}`}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {item.farmer?.first_name ?? '—'} · {item.project_stage.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.cancel} onPress={() => setOpen(false)}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:      { marginBottom: SPACING.sm },
  label:     { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  btn:       { backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: SPACING.md, borderWidth: 1.5 },
  btnTxt:    { fontSize: 14, color: COLORS.text },
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: COLORS.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', padding: SPACING.md },
  sheetTitle:{ fontSize: 16, fontWeight: '700', marginBottom: SPACING.sm, color: COLORS.text },
  row:       { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowTitle:  { fontSize: 14, fontWeight: '700', color: COLORS.text },
  rowSub:    { fontSize: 12, color: COLORS.subtext, marginTop: 2 },
  empty:     { textAlign: 'center', color: COLORS.subtext, padding: SPACING.lg },
  cancel:    { alignItems: 'center', paddingVertical: SPACING.md },
  cancelTxt: { color: COLORS.subtext, fontWeight: '600' },
});
