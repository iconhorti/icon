import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { queueAdd } from '../../db/syncQueue';
import { PhotoCapture, photosToPayload, type PhotoMap } from '../../components/shared/PhotoCapture';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const PURPLE = '#6A1B9A';
const PESTS    = ['Whitefly', 'Aphids', 'Thrips', 'Spider Mite', 'Mealybug'];
const DISEASES = ['Powdery Mildew', 'Leaf Curl Virus', 'Botrytis', 'Fusarium Wilt', 'Bacterial Blight'];
const HA_PHOTOS = ['Crop', 'Pest / Disease'] as const;

export default function HealthAssessmentScreen() {
  const [cropStage, setCropStage]         = useState('');
  const [plantHeight, setPlantHeight]     = useState('');
  const [canopyPct, setCanopyPct]         = useState('');
  const [selectedPests, setSelectedPests] = useState<string[]>([]);
  const [pestSeverity, setPestSeverity]   = useState(1);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [nutrients, setNutrients]         = useState('');
  const [photos, setPhotos]               = useState<PhotoMap>({});
  const [submitting, setSubmitting]       = useState(false);

  const togglePest    = (p: string) => setSelectedPests(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const toggleDisease = (d: string) => setSelectedDiseases(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleSubmit = async () => {
    setSubmitting(true);
    await queueAdd('health_assessment', '/agronomist/farms/0/assessment', { crop_stage: cropStage, plant_height: parseFloat(plantHeight) || 0, canopy_pct: parseFloat(canopyPct) || 0, pests: selectedPests.map(p => ({ type: p, severity: pestSeverity, treatment: '' })), diseases: selectedDiseases.map(d => ({ type: d, description: '' })), nutrients, photos: photosToPayload(photos), submitted_at: new Date().toISOString() });
    setSubmitting(false);
    Alert.alert('Saved', 'Assessment saved and will sync when connected.');
    setCropStage(''); setPlantHeight(''); setCanopyPct(''); setSelectedPests([]); setSelectedDiseases([]); setNutrients(''); setPhotos({});
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ padding: SPACING.md }}>
        <Text style={styles.label}>Crop Stage</Text>
        <TextInput style={styles.input} placeholder="e.g. Flowering, 60 DAP" value={cropStage} onChangeText={setCropStage} />
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <View style={{ flex: 1 }}><Text style={styles.label}>Plant Height (cm)</Text><TextInput style={styles.input} placeholder="85" keyboardType="numeric" value={plantHeight} onChangeText={setPlantHeight} /></View>
          <View style={{ flex: 1 }}><Text style={styles.label}>Canopy (%)</Text><TextInput style={styles.input} placeholder="80" keyboardType="numeric" value={canopyPct} onChangeText={setCanopyPct} /></View>
        </View>
        <Text style={styles.label}>Pests Detected</Text>
        <View style={styles.chipRow}>{PESTS.map(p => <TouchableOpacity key={p} style={[styles.chip, selectedPests.includes(p) && styles.chipActive]} onPress={() => togglePest(p)}><Text style={[styles.chipTxt, selectedPests.includes(p) && { color: '#fff' }]}>{p}</Text></TouchableOpacity>)}</View>
        {selectedPests.length > 0 && (
          <View><Text style={styles.label}>Severity</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>{[1,2,3,4].map(s => <TouchableOpacity key={s} style={[styles.sevBtn, pestSeverity === s && styles.sevBtnActive]} onPress={() => setPestSeverity(s)}><Text style={[styles.sevTxt, pestSeverity === s && { color: '#fff' }]}>Grade {s}</Text></TouchableOpacity>)}</View></View>
        )}
        <Text style={styles.label}>Diseases Detected</Text>
        <View style={styles.chipRow}>{DISEASES.map(d => <TouchableOpacity key={d} style={[styles.chip, selectedDiseases.includes(d) && styles.chipActive]} onPress={() => toggleDisease(d)}><Text style={[styles.chipTxt, selectedDiseases.includes(d) && { color: '#fff' }]}>{d}</Text></TouchableOpacity>)}</View>
        <Text style={styles.label}>Nutrient Observations</Text>
        <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Calcium deficiency, iron chlorosis..." multiline value={nutrients} onChangeText={setNutrients} textAlignVertical="top" />
        <Text style={styles.label}>Photos (optional)</Text>
        <PhotoCapture slots={HA_PHOTOS} photos={photos} onChange={setPhotos} accent={PURPLE} />
        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnTxt}>Save Assessment</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label:      { fontSize: 11, fontWeight: '700', color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: SPACING.md },
  input:      { backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: SPACING.md, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 14 },
  chipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  chipTxt:    { fontSize: 12, color: COLORS.subtext },
  sevBtn:     { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  sevBtnActive:{ backgroundColor: PURPLE, borderColor: PURPLE },
  sevTxt:     { fontSize: 11, color: COLORS.subtext },
  submitBtn:  { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.xl },
  submitBtnTxt:{ color: '#fff', fontWeight: '700', fontSize: 15 },
});
