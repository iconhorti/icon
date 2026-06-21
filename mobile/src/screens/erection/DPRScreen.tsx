import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { queueAdd } from '../../db/syncQueue';
import { PhotoCapture, photosToPayload, type PhotoMap } from '../../components/shared/PhotoCapture';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const ORANGE = '#E65100';
const MILESTONES = ['m1_foundation','m2_structure_erection','m3_covering_material','m4_trellising','m5_drip_fitting','m6_bed_preparation','m7_plantation'];
const ML: Record<string,string> = { m1_foundation:'M1', m2_structure_erection:'M2', m3_covering_material:'M3', m4_trellising:'M4', m5_drip_fitting:'M5', m6_bed_preparation:'M6', m7_plantation:'M7' };
const DPR_PHOTOS = ['Before', 'After'] as const;

export default function DPRScreen() {
  const [milestone, setMilestone]   = useState(MILESTONES[0]);
  const [skilled, setSkilled]       = useState('');
  const [unskilled, setUnskilled]   = useState('');
  const [workDone, setWorkDone]     = useState('');
  const [materials, setMaterials]   = useState('');
  const [photos, setPhotos]         = useState<PhotoMap>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (workDone.trim().length < 30) { Alert.alert('Work Description Required', 'Enter at least 30 characters.'); return; }
    if (Object.keys(photos).length < DPR_PHOTOS.length) {
      Alert.alert('Photos Required', `Capture both photos (${Object.keys(photos).length}/${DPR_PHOTOS.length}) before submitting.`);
      return;
    }
    setSubmitting(true);
    await queueAdd('dpr', '/projects/dpr', { milestone_key: milestone, skilled_count: parseInt(skilled) || 0, unskilled_count: parseInt(unskilled) || 0, work_done: workDone.trim(), materials_note: materials.trim(), photos: photosToPayload(photos), submitted_at: new Date().toISOString() });
    setSubmitting(false);
    Alert.alert('DPR Saved', 'Daily progress report saved and will sync when connected.');
    setWorkDone(''); setSkilled(''); setUnskilled(''); setMaterials(''); setPhotos({});
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.dateBar}><Text style={styles.dateTxt}>Today: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text></View>
      <View style={{ padding: SPACING.md }}>
        <Text style={styles.label}>Milestone</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
          {MILESTONES.map(m => (
            <TouchableOpacity key={m} style={[styles.chip, milestone === m && styles.chipActive]} onPress={() => setMilestone(m)}>
              <Text style={[styles.chipTxt, milestone === m && { color: '#fff' }]}>{ML[m]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Skilled</Text>
            <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={skilled} onChangeText={setSkilled} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Unskilled</Text>
            <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={unskilled} onChangeText={setUnskilled} />
          </View>
        </View>
        <Text style={styles.label}>Work Done Today * (min 30 chars)</Text>
        <TextInput style={[styles.input, { minHeight: 100 }]} placeholder="Describe today's work..." multiline numberOfLines={4} value={workDone} onChangeText={setWorkDone} textAlignVertical="top" />
        <Text style={styles.charCount}>{workDone.length} chars</Text>
        <Text style={styles.label}>Materials Consumed</Text>
        <TextInput style={styles.input} placeholder="GI Pipe 50m, UV Film 20m..." value={materials} onChangeText={setMaterials} />
        <Text style={styles.label}>Progress Photos (before / after)</Text>
        <PhotoCapture slots={DPR_PHOTOS} photos={photos} onChange={setPhotos} min={DPR_PHOTOS.length} accent={ORANGE} />
        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnTxt}>Submit DPR</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dateBar:    { backgroundColor: ORANGE, padding: SPACING.md },
  dateTxt:    { color: '#fff', fontWeight: '700', fontSize: 13 },
  label:      { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: SPACING.md },
  input:      { backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 14 },
  charCount:  { fontSize: 10, color: COLORS.subtext, textAlign: 'right', marginTop: 4 },
  chip:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8 },
  chipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  chipTxt:    { fontSize: 12, fontWeight: '600', color: COLORS.subtext },
  photoNote:  { backgroundColor: '#FFF3E0', borderRadius: 10, padding: SPACING.md, marginTop: SPACING.md, borderLeftWidth: 3, borderLeftColor: ORANGE },
  photoNoteTxt:{ fontSize: 12, color: ORANGE },
  submitBtn:  { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.xl },
  submitBtnTxt:{ color: '#fff', fontWeight: '700', fontSize: 15 },
});
